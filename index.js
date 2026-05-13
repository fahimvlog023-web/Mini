const {
default: makeWASocket,
useMultiFileAuthState,
DisconnectReason
} = require("@whiskeysockets/baileys")

const P = require("pino")

// ===== SETTINGS =====
const ownerNumber = "8801300285514"

// ===== ANTISTATUS DATA =====
let antiStatusGroups = []

async function startBot() {

const { state, saveCreds } =
await useMultiFileAuthState("./session")

const sock = makeWASocket({
auth: state,
logger: P({ level: "silent" }),
browser: ["Fahim Bot", "Chrome", "1.0.0"]
})

sock.ev.on("creds.update", saveCreds)

// ===== PAIR CODE =====
if (!sock.authState.creds.registered) {

const code =
await sock.requestPairingCode(ownerNumber)

console.log("\n===================")
console.log("PAIR CODE:", code)
console.log("===================\n")

}

// ===== WELCOME / GOODBYE =====
sock.ev.on(
"group-participants.update",
async(data) => {

const jid = data.id

for (let user of data.participants) {

if (data.action === "add") {

await sock.sendMessage(jid, {
text: `👋 Welcome @${
user.split("@")[0]
}`,
mentions: [user]
})

}

if (data.action === "remove") {

await sock.sendMessage(jid, {
text: `😢 Goodbye @${
user.split("@")[0]
}`,
mentions: [user]
})

}

}

}
)

// ===== MESSAGE =====
sock.ev.on(
"messages.upsert",
async({ messages }) => {

const m = messages[0]
if (!m.message) return

const from = m.key.remoteJid
const isGroup = from.endsWith("@g.us")

const sender =
m.key.participant || m.key.remoteJid

const text =
m.message.conversation ||
m.message.extendedTextMessage?.text ||
""

// ===== MENU =====
if (text === "/menu") {

await sock.sendMessage(from, {
text: `
🤖 *FAHIM BOT*

📌 COMMANDS

/menu
/ping
/tagall
/owner
/antistatus on
/antistatus off

⚡ FEATURES
✅ Welcome
✅ Goodbye
✅ AntiStatus
✅ TagAll
✅ Fast Reply
`
})

}

// ===== PING =====
if (text === "/ping") {

await sock.sendMessage(from, {
text: "🏓 Pong!"
})

}

// ===== OWNER =====
if (text === "/owner") {

await sock.sendMessage(from, {
text: "👑 Owner: Fahim BBz"
})

}

// ===== TAGALL =====
if (text === "/tagall" && isGroup) {

const metadata =
await sock.groupMetadata(from)

const participants =
metadata.participants.map(v => v.id)

let teks = "📢 TAG ALL\n\n"

for (let mem of participants) {
teks += `@${mem.split("@")[0]}\n`
}

await sock.sendMessage(from, {
text: teks,
mentions: participants
})

}

// ===== ANTISTATUS ON =====
if (text === "/antistatus on") {

if (!antiStatusGroups.includes(from)) {
antiStatusGroups.push(from)
}

await sock.sendMessage(from, {
text: "✅ AntiStatus ON"
})

}

// ===== ANTISTATUS OFF =====
if (text === "/antistatus off") {

antiStatusGroups =
antiStatusGroups.filter(g => g !== from)

await sock.sendMessage(from, {
text: "❌ AntiStatus OFF"
})

}

// ===== STATUS DETECT =====
const contextInfo =
m.message?.extendedTextMessage?.contextInfo ||
m.message?.imageMessage?.contextInfo ||
m.message?.videoMessage?.contextInfo

const isStatus =
contextInfo?.remoteJid ===
"status@broadcast"

if (
isStatus &&
antiStatusGroups.includes(from)
) {

try {

await sock.sendMessage(from, {
delete: m.key
})

await sock.sendMessage(from, {
text: `❌ @${
sender.split("@")[0]
} Status mention deleted!`,
mentions: [sender]
})

} catch(err) {

console.log(err)

}

}

}
)

// ===== AUTO RECONNECT =====
sock.ev.on(
"connection.update",
async({ connection, lastDisconnect }) => {

if (connection === "close") {

const shouldReconnect =
lastDisconnect?.error?.output
?.statusCode !==
DisconnectReason.loggedOut

if (shouldReconnect) {
startBot()
}

}

if (connection === "open") {

console.log("✅ BOT CONNECTED")

}

}
)

}

startBot()
