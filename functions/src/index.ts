import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { Client, GatewayIntentBits } from 'discord.js';
import { defineString } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions';
import * as logger from 'firebase-functions/logger';
import { FirebaseAuthError } from 'firebase-admin/auth';
import { onDocumentUpdated } from 'firebase-functions/firestore';

/*

    DISCORD_ROLE1_ID=1421501852612296826
    DISCORD_ROLE2_ID=1421502999964029059
    DISCORD_ROLE3_ID=1421503067681194065

*/

admin.initializeApp();
const db = getFirestore();

setGlobalOptions({ maxInstances: 1 });

const DISCORD_BOT_TOKEN = defineString('DISCORD_BOT_TOKEN');
const DISCORD_CLIENT_ID = defineString('DISCORD_CLIENT_ID');
const DISCORD_CLIENT_SECRET = defineString('DISCORD_CLIENT_SECRET');
const DISCORD_REDIRECT_URI = defineString('DISCORD_REDIRECT_URI');
const DISCORD_GUILD_ID = defineString('DISCORD_GUILD_ID');
const DISCORD_ROLE1_ID = defineString('DISCORD_ROLE1_ID');
const DISCORD_ROLE2_ID = defineString('DISCORD_ROLE2_ID');
const DISCORD_ROLE3_ID = defineString('DISCORD_ROLE3_ID');

const FRONTEND_URL = defineString('FRONTEND_URL');

export const startDiscordOAuth = onRequest(async (req, res) => {
    const clientId = DISCORD_CLIENT_ID.value();
    const redirectUri = DISCORD_REDIRECT_URI.value();

    const state = req.query.state as string;
    if (!state) {
        res.status(400).send('Missing state parameter');
        return;
    }
    const role = req.query.role as string;
    if (!role) {
        res.status(400).send('Missing role');
        return;
    }

    await db
        .collection('oauth_states')
        .doc(state)
        .set({
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            used: false,
            role,
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

export const discordCallback = onRequest(async (req, res) => {
    const redirectUri = DISCORD_REDIRECT_URI.value();
    const frontendUrl = FRONTEND_URL.value();

    try {
        logger.log('--- Discord callback triggered ---');
        logger.log('Query parameters:', req.query);

        const { code, state } = req.query;

        // Validate state
        if (!state || typeof state !== 'string') {
            logger.error('Invalid state parameter:', state);
            res.redirect(`${frontendUrl}?error=invalid_state`);
            return;
        }
        logger.log('State is valid:', state);

        const stateDocRef = db.collection('oauth_states').doc(state);

        let stateDoc;
        try {
            stateDoc = await stateDocRef.get();
            logger.log('Fetched oauth_states document:', stateDoc.exists);
        } catch (err) {
            logger.error('Failed to fetch oauth_states document:', err);
            res.redirect(`${frontendUrl}?error=oauth_state_lookup_failed`);
            return;
        }

        if (
            !stateDoc.exists ||
            stateDoc.data()?.used ||
            stateDoc.data()?.expiresAt.toDate() < new Date()
        ) {
            logger.error(
                'State document invalid, used, or expired:',
                stateDoc.data()
            );
            res.redirect(`${frontendUrl}?error=invalid_state`);
            return;
        }

        const role = stateDoc.data()?.role;
        if (!role) {
            res.redirect(`${frontendUrl}?error=missing_role`);
            return;
        }

        logger.log('Marking state as used');
        await stateDocRef.update({ used: true }).catch((err) => {
            logger.error('Failed to mark oauth_states document as used:', err);
        });

        // Fetch secrets
        const botToken = DISCORD_BOT_TOKEN.value();
        const clientId = DISCORD_CLIENT_ID.value();
        const clientSecret = DISCORD_CLIENT_SECRET.value();
        const guildId = DISCORD_GUILD_ID.value();

        const roles: Record<string, string> = {
            role1: DISCORD_ROLE1_ID.value(),
            role2: DISCORD_ROLE2_ID.value(),
            role3: DISCORD_ROLE3_ID.value(),
        };
        logger.log('Fetched Discord secrets and role IDs');
        const roleId = roles[role];
        if (!roleId) {
            res.redirect(`${frontendUrl}?error=invalid_discord_role`);
            return;
        }

        // Exchange code for Discord token
        let tokens;
        try {
            logger.log('Exchanging code for access token...');
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

            tokens = await tokenRes.json();
            logger.log('Received Discord tokens:', tokens);

            if (!tokens.access_token) {
                logger.error(
                    'Discord token exchange did not return access_token',
                    tokens
                );
                res.redirect(`${frontendUrl}?error=discord_token_failed`);
                return;
            }
        } catch (err) {
            logger.error('Error exchanging code for Discord token:', err);
            res.redirect(`${frontendUrl}?error=discord_token_fetch_error`);
            return;
        }

        logger.log('Received Discord tokens:', tokens);

        if (!tokens.access_token) {
            logger.error('Failed to get access token from Discord', tokens);
            res.redirect(`${frontendUrl}?error=discord_token_failed`);
            return;
        }

        // Get user info
        let user;
        try {
            logger.log('Fetching Discord user info...');
            const userRes = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            });

            if (!userRes.ok) {
                const text = await userRes.text();
                logger.error(
                    'Discord user info fetch failed:',
                    userRes.status,
                    text
                );
                res.redirect(`${frontendUrl}?error=discord_user_fetch_failed`);
                return;
            }

            user = await userRes.json();
            logger.log('Discord user info:', user);

            if (!user.id) {
                logger.error('Invalid Discord user data:', user);
                res.redirect(`${frontendUrl}?error=discord_user_invalid`);
                return;
            }
        } catch (err) {
            logger.error('Error fetching Discord user info:', err);
            res.redirect(`${frontendUrl}?error=discord_user_fetch_error`);
            return;
        }
        logger.log('Discord user info:', user);

        if (!user.id) {
            logger.error('Invalid user data from Discord:', user);
            res.redirect(`${frontendUrl}?error=discord_user_invalid`);
            return;
        }

        // Grant Discord role
        let roleSuccess = false;
        try {
            logger.log('Granting Discord role...');
            roleSuccess = await grantRole(
                user.id,
                tokens.access_token,
                roleId,
                guildId,
                botToken
            );
            logger.log('Role grant success:', roleSuccess);
        } catch (err) {
            logger.error('Error granting Discord role:', err);
            res.redirect(`${frontendUrl}?error=discord_role_grant_error`);
            return;
        }

        if (!roleSuccess) {
            logger.error('Discord role grant returned false');
            res.redirect(`${frontendUrl}?error=discord_role_grant_failed`);
            return;
        }

        // --- Firebase Custom Token ---
        const uid = `discord:${user.id}`;
        logger.log('Creating/updating Firebase user:', uid);

        try {
            // Check if the user already exists
            await admin.auth().getUser(uid);

            // If we got here, user exists -> update
            await admin.auth().updateUser(uid, { displayName: user.username });
            logger.log('Updated existing Firebase user:', uid);
        } catch (err) {
            // If user-not-found
            // create, otherwise rethrow so outer catch handles it
            if ((err as FirebaseAuthError).code === 'auth/user-not-found') {
                logger.log('User not found, creating...', uid);
                const userRecord = await admin
                    .auth()
                    .createUser({ uid, displayName: user.username });
                logger.log('Created new user record', userRecord.uid);
            } else {
                logger.error('Error checking/creating Firebase user:', err);
                res.redirect(`${frontendUrl}?error=create_firebase_user_error`);
            }
        }

        /*
        
        await admin
            .auth()
            .updateUser(uid, { displayName: user.username })
            .catch(async (err: FirebaseAuthError) => {
                logger.log('Firebase updateUser error:', err.code);
                if (err.code === 'auth/user-not-found') {
                    logger.log('User not found, creating...');
                    const userRecord = await admin
                        .auth()
                        .createUser({ uid, displayName: user.username });
                    logger.log('Created new user record', userRecord.uid, uid);
                } else {
                    throw err;
                }
            });

        */

        let firebaseToken: string;
        try {
            logger.log('Generating Firebase custom token for user.', uid);
            firebaseToken = await admin.auth().createCustomToken(uid);
            logger.log('Generated Firebase custom token:', firebaseToken);
        } catch (err) {
            logger.error('Failed to generate Firebase custom token:', err);
            res.redirect(
                `${frontendUrl}?error=firebase_token_generation_failed`
            );
            return;
        }

        // Persist single user role in Firestore
        try {
            await db.collection('users').doc(uid).set(
                {
                    role,
                    lastRoleUpdate:
                        admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true } // merge in case other fields exist
            );
            logger.log('Saved single user role in Firestore for', uid);
        } catch (err) {
            logger.error('Failed to save user role in Firestore:', err);
        }

        logger.log('Redirecting user back to frontend...');
        res.redirect(`${frontendUrl}?firebaseToken=${firebaseToken}`);
    } catch (err) {
        logger.error('Discord OAuth error:', err);
        res.redirect(
            `${frontendUrl}?error=${encodeURIComponent(JSON.stringify(err))}`
        );
    }
});

async function getDiscordClient(botToken: string) {
    const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    });

    try {
        await client.login(botToken);
        return client;
    } catch (err) {
        // If login fails, ensure client is destroyed 
        // and rethrow for caller to handle
        try {
            await client.destroy();
        } catch {
            console.warn('Failed to destroy discord client');
        }
        throw err;
    }
}

async function grantRole(
    userId: string,
    accessToken: string,
    roleId: string,
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
        logger.error('Role grant error:', err);
        return false;
    }
}

export const onUserRoleChange = onDocumentUpdated(
    'users/{uid}',
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        const uid = event.params.uid;

        if (!before || !after) return;

        if (before.role === after.role) return; // No role change

        const roles: Record<string, string> = {
            role1: DISCORD_ROLE1_ID.value(),
            role2: DISCORD_ROLE2_ID.value(),
            role3: DISCORD_ROLE3_ID.value(),
        };

        const newRoleId = roles[after.role];
        if (!newRoleId) {
            logger.error('Invalid role:', after.role);
            return;
        }

        const client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
        });

        try {
            await client.login(DISCORD_BOT_TOKEN.value());
            const guild = await client.guilds.fetch(DISCORD_GUILD_ID.value());
            const member = await guild.members.fetch(
                uid.replace('discord:', '')
            );

            // Remove all other roles from this set
            for (const roleId of Object.values(roles)) {
                if (member.roles.cache.has(roleId) && roleId !== newRoleId) {
                    await member.roles.remove(roleId);
                }
            }

            // Add the new role if not already present
            if (!member.roles.cache.has(newRoleId)) {
                await member.roles.add(newRoleId);
            }

            logger.log(`Updated Discord role for ${uid} to ${after.role}`);
            await client.destroy();
        } catch (err) {
            logger.error('Discord role update error:', err);
            await client.destroy();
        }
    }
);
