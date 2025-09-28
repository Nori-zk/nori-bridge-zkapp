import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import crypto from 'crypto';
import { Client, GatewayIntentBits } from 'discord.js';
import { defineString } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions';
import * as logger from 'firebase-functions/logger';
import { FirebaseAuthError } from 'firebase-admin/auth';

admin.initializeApp();
const db = getFirestore();

setGlobalOptions({ maxInstances: 1 });

/*
  defineSecret
  const DISCORD_BOT_TOKEN = defineSecret('DISCORD_BOT_TOKEN');
  const DISCORD_CLIENT_ID = defineSecret('DISCORD_CLIENT_ID');
  const DISCORD_CLIENT_SECRET = defineSecret('DISCORD_CLIENT_SECRET');
  const DISCORD_REDIRECT_URI = defineSecret('DISCORD_REDIRECT_URI');
  const DISCORD_GUILD_ID = defineSecret('DISCORD_GUILD_ID');
  const DISCORD_ROLE1_ID = defineSecret('DISCORD_ROLE1_ID');
  const DISCORD_ROLE2_ID = defineSecret('DISCORD_ROLE2_ID');
  const DISCORD_ROLE3_ID = defineSecret('DISCORD_ROLE3_ID');
*/
const DISCORD_BOT_TOKEN = defineString('DISCORD_BOT_TOKEN');
const DISCORD_CLIENT_ID = defineString('DISCORD_CLIENT_ID');
const DISCORD_CLIENT_SECRET = defineString('DISCORD_CLIENT_SECRET');
const DISCORD_REDIRECT_URI = defineString('DISCORD_REDIRECT_URI');
const DISCORD_GUILD_ID = defineString('DISCORD_GUILD_ID');
const DISCORD_ROLE1_ID = defineString('DISCORD_ROLE1_ID');
const DISCORD_ROLE2_ID = defineString('DISCORD_ROLE2_ID');
const DISCORD_ROLE3_ID = defineString('DISCORD_ROLE3_ID');

export const startDiscordOAuth = onRequest(async (req, res) => {
    const clientId = DISCORD_CLIENT_ID.value();
    const redirectUri = DISCORD_REDIRECT_URI.value();

    const state = crypto.randomBytes(16).toString('hex');

    await db
        .collection('oauth_states')
        .doc(state)
        .set({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            used: false,
            expiresAt: admin.firestore.Timestamp.fromDate(
                new Date(Date.now() + 15 * 60 * 1000)
            ), // 15 min TTL
        });

    const url = new URL('https://discord.com/api/oauth2/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'identify guilds.join');
    url.searchParams.set('state', state);

    res.redirect(url.toString());
});

export const discordCallback = onRequest(
    {
        /*
        secrets: [
            DISCORD_BOT_TOKEN,
            DISCORD_CLIENT_ID,
            DISCORD_CLIENT_SECRET,
            DISCORD_REDIRECT_URI,
            DISCORD_GUILD_ID,
            DISCORD_ROLE1_ID,
            DISCORD_ROLE2_ID,
            DISCORD_ROLE3_ID,
        ],
        */
    },
    async (req, res) => {
        try {
            const { code, state } = req.query;

            // Validate state
            const stateDoc = await db
                .collection('oauth_states')
                .doc(state as string)
                .get();
            if (
                !stateDoc.exists ||
                stateDoc.data()?.used ||
                stateDoc.data()?.expiresAt.toDate() < new Date()
            ) {
                res.redirect(
                    `${DISCORD_REDIRECT_URI.value()}?error=invalid_state`
                );
                return;
            }
            await db
                .collection('oauth_states')
                .doc(state as string)
                .update({ used: true });

            // Fetch secrets
            const botToken = DISCORD_BOT_TOKEN.value();
            const clientId = DISCORD_CLIENT_ID.value();
            const clientSecret = DISCORD_CLIENT_SECRET.value();
            const redirectUri = DISCORD_REDIRECT_URI.value();
            const guildId = DISCORD_GUILD_ID.value();
            const roles = {
                role1: DISCORD_ROLE1_ID.value(),
                role2: DISCORD_ROLE2_ID.value(),
                role3: DISCORD_ROLE3_ID.value(),
            };

            // Exchange code for Discord token
            const tokenRes = await fetch(
                'https://discord.com/api/oauth2/token',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        code: code as string,
                        grant_type: 'authorization_code',
                        redirect_uri: redirectUri,
                        scope: 'identify guilds.join',
                    }),
                }
            );
            const tokens = await tokenRes.json();

            // Get user info
            const userRes = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            });
            const user = await userRes.json();

            // Grant Discord role
            const roleSuccess = await grantRole(
                user.id,
                tokens.access_token,
                roles,
                guildId,
                botToken
            );
            if (!roleSuccess) {
                res.redirect(`${redirectUri}?error=role_failed`);
                return;
            }

            // --- Firebase Custom Token ---
            const uid = `discord:${user.id}`;
            await admin
                .auth()
                .updateUser(uid, { displayName: user.username })
                .catch(async (err: FirebaseAuthError) => {
                    if (err.code === 'auth/user-not-found') {
                        await admin
                            .auth()
                            .createUser({ uid, displayName: user.username });
                    } else {
                        throw err;
                    }
                });
            const firebaseToken = await admin.auth().createCustomToken(uid);

            // Redirect user to frontend with custom token
            res.redirect(`${redirectUri}?firebaseToken=${firebaseToken}`);
        } catch (err) {
            logger.error('Discord OAuth error:', err);
            const redirectUri = DISCORD_REDIRECT_URI.value();
            res.redirect(`${redirectUri}?error=internal`);
        }
    }
);

async function grantRole(
    userId: string,
    accessToken: string,
    roles: Record<string, string>,
    guildId: string,
    botToken: string
) {
    try {
        const client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
        });
        await client.login(botToken);
        const guild = client.guilds.cache.get(guildId);
        if (!guild) throw new Error('Guild not found');

        const roleId = roles['role1'];
        await guild.roles.fetch();

        let member;
        try {
            member = await guild.members.fetch(userId);
            if (!member.roles.cache.has(roleId)) await member.roles.add(roleId);
        } catch {
            member = await guild.members.add(userId, { accessToken });
            await member.roles.add(roleId);
        }

        await member.fetch(true);
        await client.destroy();
        return member.roles.cache.has(roleId);
    } catch (err) {
        console.error('Role grant error:', err);
        return false;
    }
}
