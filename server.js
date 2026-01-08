import express from "express";
import path from "path";
import http from "http";
import cors from "cors";
import "dotenv/config";

import { Client, GatewayIntentBits } from "discord.js";

const app = express();
const port = 8090;

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(
	cors({
		origin: "http://localhost:3000", // Allow React app
		credentials: true,
	})
);
// Serve static files from /out with COOP/COEP/CORP + no caching
app.use(
	express.static(path.resolve("out"), {
		setHeaders: (res, filePath) => {
			res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
			res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
			res.setHeader("Cross-Origin-Resource-Policy", "same-origin"); // required for workers - check its probably not needed....

			res.setHeader(
				"Cache-Control",
				"no-store, no-cache, must-revalidate, proxy-revalidate"
			);
			res.setHeader("Pragma", "no-cache");
			res.setHeader("Expires", "0");
			res.setHeader("Surrogate-Control", "no-store");
		},
	})
);

// Fallback for index.html (important for SPA routing)
app.get(/.*/, (req, res) => {
	res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
	res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
	res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
	res.setHeader(
		"Cache-Control",
		"no-store, no-cache, must-revalidate, proxy-revalidate"
	);
	res.setHeader("Pragma", "no-cache");
	res.setHeader("Expires", "0");
	res.setHeader("Surrogate-Control", "no-store");

	res.sendFile(path.resolve("out/index.html"));
});

// Create HTTP server
const server = http.createServer(app);

server.listen(port, () => {
	console.log(`Server running at http://127.0.0.1:${port}`);
});

// Discord OAuth callback route
app.post("/auth/discord", async (req, res) => {
	const { code, roleType } = req.body;
	if (!process.env.DISCORD_BOT_TOKEN) {
		console.error("DISCORD_BOT_TOKEN is not set!");
		return false;
	}
	try {
		// Exchange code for access token
		const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: process.env.DISCORD_CLIENT_ID,
				client_secret: process.env.DISCORD_CLIENT_SECRET,
				code: code,
				grant_type: "authorization_code",
				redirect_uri: process.env.DISCORD_REDIRECT_URI,
				scope: "identify guilds.join",
			}),
		});

		const tokens = await tokenResponse.json();

		// Get user info
		const userResponse = await fetch("https://discord.com/api/users/@me", {
			headers: { Authorization: `Bearer ${tokens.access_token}` },
		});

		const user = await userResponse.json();

		// Grant the role
		const success = await grantRole(user.id, tokens.access_token, roleType);

		if (success) {
			res.json({
				success: true,
				message: `Role granted successfully!`,
				user: { username: user.username },
			});
		} else {
			res.status(400).json({ error: "Failed to grant role" });
		}
	} catch (error) {
		console.error("Discord auth error:", error);
		res.status(500).json({ error: "Authentication failed" });
	}
});
// Function to grant roles
async function grantRole(userId, accessToken, roleType) {
	const roleMapping = {
		role1: process.env.DISCORD_ROLE1_ID,
		role2: process.env.DISCORD_ROLE2_ID,
		role3: process.env.DISCORD_ROLE3_ID,
	};

	try {
		const client = new Client({
			intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
		});
		await client.login(process.env.DISCORD_BOT_TOKEN);

		const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
		const roleId = roleMapping[roleType];

		console.log("🔍 Debug role info:");
		console.log("Looking for role ID:", roleId);
		console.log("Role ID type:", typeof roleId);
		console.log("Role ID length:", roleId?.length);

		// Force fetch roles if cache is empty
		await guild.roles.fetch();

		// Debug: List all roles in guild
		console.log("📋 All roles in guild:");
		guild.roles.cache.forEach((role) => {
			console.log(`  - ${role.name}: ${role.id}`);
		});

		const role = guild.roles.cache.get(roleId);

		if (!role) {
			console.error("❌ Role not found!");
			await client.destroy();
			return false;
		}

		console.log("✅ Role found:", role.name);

		let member;

		// First, check if user is already a member of the guild
		try {
			member = await guild.members.fetch(userId);
			console.log("👤 User is already a member of the guild");

			// Check if user already has the role
			if (member.roles.cache.has(roleId)) {
				console.log("ℹ️ User already has this role");
				await client.destroy();
				return true;
			}

			// Add role to existing member
			await member.roles.add(roleId);
			console.log("✅ Role granted to existing member");
		} catch (fetchError) {
			// User is not in the guild, try to add them
			console.log("👤 User not in guild, attempting to add...");

			try {
				member = await guild.members.add(userId, {
					accessToken: accessToken,
				});
				console.log("✅ User added to guild");

				// Now add the role to the newly added member
				await member.roles.add(roleId);
				console.log("✅ Role granted to new member");
			} catch (addError) {
				console.error("❌ Failed to add user to guild:", addError);

				// Sometimes members.add fails even if user exists, try fetching again
				try {
					member = await guild.members.fetch(userId);
					await member.roles.add(roleId);
					console.log("✅ Role granted after retry");
				} catch (retryError) {
					console.error("❌ Final attempt failed:", retryError);
					await client.destroy();
					return false;
				}
			}
		}

		// Verify the role was actually assigned
		try {
			await member.fetch(true); // Force refresh member data
			const hasRole = member.roles.cache.has(roleId);
			console.log(
				"🔍 Role verification:",
				hasRole ? "✅ Role confirmed" : "❌ Role not found on member"
			);

			await client.destroy();
			return hasRole;
		} catch (verifyError) {
			console.error("❌ Failed to verify role assignment:", verifyError);
			await client.destroy();
			return false;
		}
	} catch (error) {
		console.error("❌ Role grant error:", error);
		return false;
	}
}
