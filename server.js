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

		// Debug: List all roles in the guild
		console.log("📋 All roles in guild:");
		guild.roles.cache.forEach((role) => {
			console.log(`  - ${role.name}: ${role.id}`);
		});

		// Try different ways to find the role
		const role = guild.roles.cache.get(roleId);
		const roleByFind = guild.roles.cache.find((r) => r.id === roleId);

		console.log("Role found by get():", !!role);
		console.log("Role found by find():", !!roleByFind);

		if (!role) {
			console.error("❌ Role not found!");
			console.log("Checking if role ID has extra characters...");

			// Try trimming whitespace
			const trimmedRoleId = roleId?.trim();
			const roleWithTrim = guild.roles.cache.get(trimmedRoleId);
			console.log("Role found after trim:", !!roleWithTrim);

			await client.destroy();
			return false;
		}

		console.log("✅ Role found:", role.name);

		// Rest of your role assignment logic...
		try {
			const member = await guild.members.add(userId, {
				accessToken: accessToken,
				roles: [roleId],
			});
			console.log("✅ User added with role");
		} catch (addError) {
			console.error("Error adding user to guild:", addError);
			console.log("Adding role to existing member...");
			const member = await guild.members.fetch(userId);
			await member.roles.add(roleId);
			console.log("✅ Role granted");
		}

		await client.destroy();
		return true;
	} catch (error) {
		console.error("❌ Role grant error:", error);
		return false;
	}
}
