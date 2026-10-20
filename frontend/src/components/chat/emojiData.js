// Built-in emoji set (no external library / network). Native keyboard emoji still work in the box too.
const E = (s) => s.trim().split(/\s+/)
export const EMOJI_GROUPS = [
  { id: 'smileys', label: 'Smileys', icon: '😀', items: E('😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😮‍💨 🤥 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬') },
  { id: 'gestures', label: 'Hands', icon: '👍', items: E('👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤝 👏 🙌 👐 🤲 🙏 ✍️ 💪 🦾 🫶 🫡 🫱 🫲 👀 👁️ 🧠 🗣️ 👤 👥') },
  { id: 'hearts', label: 'Hearts', icon: '❤️', items: E('❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💯 💢 💥 💫 💦 💨 🔥 ✨ ⭐ 🌟 ⚡ 🎉 🎊 🎁 🏆 🥇 🎯') },
  { id: 'farm', label: 'Farm', icon: '🌱', items: E('🌱 🌿 🍀 🌾 🌽 🥕 🍅 🍆 🥔 🧅 🧄 🥬 🥦 🌶️ 🥒 🫘 🥜 🍌 🍍 🥭 🍉 🍊 🍋 🍎 🍐 🍓 🍇 🥑 🥥 ☕ 🌳 🌴 🌻 🌼 🌸 🌺 🍂 🍃 🐄 🐃 🐐 🐑 🐓 🐖 🐝 🦋 🐛 🐜 🪲 🐞 🦗 🪱 🚜 🌧️ ☀️ ⛅ 🌦️ 💧 🌍') },
  { id: 'work', label: 'Work', icon: '📦', items: E('📦 🚚 🚛 🛒 🏪 🏬 🏢 🧪 🧴 🧰 🛠️ 🔧 🔨 ⚙️ 📋 📝 📄 📎 📌 📍 📞 ☎️ 📱 💬 💭 📧 ✉️ 📅 🕒 ⏰ ⏳ ✅ ☑️ ❌ ⚠️ 🚫 ❓ ❗ ℹ️ 🔔 🔒 🔑 💰 💵 🧾 📈 📉 📊') },
  { id: 'symbols', label: 'Symbols', icon: '✔️', items: E('✔️ ➕ ➖ ➡️ ⬅️ ⬆️ ⬇️ ↩️ 🔄 🔁 🆗 🆕 🆓 🔝 🔜 ♻️ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟥 🟩 🟦 ▶️ ⏸️ ⏹️ 🏁 🚩 🇺🇬') },
]
export const ALL_EMOJI = EMOJI_GROUPS.flatMap((g) => g.items)
