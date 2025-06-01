# Easy text

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) **Easy text**是一款安全的、注重隐私的临时信息分享应用。它允许用户创建受密码保护的、阅后即焚或定时销毁的加密笔记/消息，并通过生成的唯一链接进行分享。所有加密和解密操作均在用户浏览器端完成，服务器不接触任何明文内容或密码。

---

## ✨ 项目特色 (Features)

* **🛡️ 端对端加密 (End-to-End Encryption):**
    * 秘密内容在发送到服务器前已在浏览器端加密。
    * 解密操作同样在接收者的浏览器端进行。
    * 服务器仅存储加密数据，无法访问原始明文或密码。
* **🔑 自定义密码或默认密码 (Custom or Default Password):**
    * 用户可以为每个秘密设置强密码。
    * 如果用户选择不设置密码，系统将使用预设的默认密码（"MrLee"）进行加密，并明确提示用户。
* **⏱️ 灵活的销毁选项 (Flexible Destruction Options):**
    * **阅后即焚 (Read Once & Burn):** 秘密在被第一次成功查看后，将从服务器永久删除。
    * **定时销毁 (Timed Destruction):** 用户可以设置秘密在特定时间后自动从服务器销毁（例如：5分钟、30分钟、1小时、6小时、1天）。
* **✍️ Markdown 支持 (Markdown Support):**
    * 用户可以使用 Markdown 语法来格式化其秘密内容，支持文本样式、列表、链接等。
* **⚔️ XSS 防护 (XSS Protection):**
    * 所有由用户提供的、将作为 HTML 显示的 Markdown 内容都会经过严格的净化处理，以防止跨站脚本攻击 (XSS)。
* **🎨 纯深色科技感主题 (Dark Tech-Inspired Theme):**
    * 提供现代、美观且统一的深色用户界面，增强科技感和视觉舒适度。
* **📱 响应式设计 (Responsive Design):**
    * 界面能够良好地适应桌面、平板和手机等不同尺寸的设备。
* **🚀 用户体验优化 (Optimized User Experience):**
    * 在执行 CPU 密集型操作（如加密和解密）时，通过前端 Web Worker 技术确保用户界面保持流畅和响应，并配有即时加载动画。
    * 提供清晰的视觉反馈，例如链接复制成功后的提示。
    * 包含如图标跳动光效等动态视觉元素，增强界面生动性。
* **☁️ 轻量级后端 (Lightweight Backend):**
    * 后端采用 Cloudflare Workers 和 Cloudflare KV 构建，具有高性能、高可用性和可扩展性，同时保持轻量。

---

## 🛠️ 技术栈 (Tech Stack)

**前端 (Frontend):**

* **框架 (Framework):** Vue.js 3 (使用 Composition API)
* **构建工具 (Build Tool):** Vite
* **CSS 框架 (CSS Framework):** Bulma (直接导入 `bulma.css`，通过 CSS 自定义属性进行主题化)
* **路由 (Routing):** Vue Router
* **图标 (Icons):** Font Awesome (Solid & Brands 风格)
* **客户端加密库 (Client-side Encryption):** CryptoJS (用于 PBKDF2 密钥派生, AES-256-CBC 加密, HMAC-SHA256 消息认证)
* **Markdown 处理 (Markdown Processing):** `marked` (用于解析 Markdown), `dompurify` (用于净化 HTML 输出以防 XSS)
* **Web Workers:** 用于在后台线程执行加密和解密操作，避免阻塞 UI 主线程。

**后端 (Backend):**

* **运行环境 (Runtime):** Cloudflare Workers
* **框架 (Framework):** Hono (一个用于边缘计算的轻量级 Web 框架)
* **数据存储 (Data Storage):** Cloudflare KV (用于存储加密后的秘密内容和元数据)

---

## 🛡️ 加密与解密流程

**加密流程 (发送者):**

1.  **输入内容与密码:** 用户在浏览器中输入想要加密的明文内容和自定义密码。如果密码字段留空，系统将使用预设的默认密码 "MrLee"。
2.  **准备加密任务:** 前端应用收集明文、实际使用的密码（用户输入或默认密码）、以及可选的内嵌过期时间戳（主要由服务器TTL控制，此为辅助）。
3.  **后台加密 (Web Worker):**
    * 前端的 `CryptoService` 将加密任务发送给一个在后台线程运行的 Web Worker (`crypto.worker.js`)。
    * Web Worker 内部执行以下操作：
        a.  **生成随机盐 (Salt):** 为本次加密生成一个唯一的、密码学安全的随机盐。
        b.  **派生密钥 (PBKDF2):** 使用 PBKDF2 算法，结合用户密码和随机盐，进行多次迭代（例如100,000次）来派生出一个高强度的密钥。
        c.  **分割密钥:** 将派生出的密钥分割为两部分：一部分用作对称加密密钥 (Encryption Key, KE)，另一部分用作消息认证码密钥 (MAC Key, KM)。
        d.  **对称加密 (AES-256-CBC):** 生成一个随机的初始向量 (Initialization Vector, IV)。使用加密密钥 (KE) 和 IV，通过 AES-256-CBC 算法加密包含明文和过期时间戳的载荷，得到密文 (Ciphertext)。
        e.  **计算消息认证码 (HMAC-SHA256):** 使用 MAC 密钥 (KM)，为 IV 和密文的组合计算 HMAC-SHA256 标签 (MAC Tag)。这用于验证数据的完整性和真实性。
4.  **返回加密体:** Web Worker 将一个组合字符串（通常格式为 `base64(盐).base64(IV).base64(密文).base64(MAC标签)`）返回给主线程的 `CryptoService`。
5.  **发送至后端:** `CryptoService` 将此加密体连同用户选择的销毁选项（如阅后即焚、定时销毁的具体时长）通过 API 发送给后端 Cloudflare Worker。
6.  **后端存储:** 后端 Cloudflare Worker 生成一个唯一的秘密 ID，然后将加密体和销毁元数据（包括KV条目的TTL）存入 Cloudflare KV。**后端不存储原始密码，也无法解密内容。**
7.  **返回链接:** 后端 API 将包含秘密 ID 的唯一分享链接返回给前端。
8.  **展示链接:** 前端向用户显示这个安全的分享链接。

**解密流程 (接收者):**

1.  **访问链接:** 用户通过分享的秘密链接访问应用。
2.  **获取加密数据:** 前端从 URL 中提取秘密 ID，并向后端 API 请求对应的加密数据。
3.  **后端处理:** 后端 API 从 Cloudflare KV 中根据 ID 检索加密体。如果该秘密被标记为“阅后即焚”，则在此时从 KV 中删除该条目。
4.  **返回加密体:** 后端 API 将加密体（`盐.IV.密文.MAC标签`）返回给前端。
5.  **输入密码:** 前端提示用户输入解密密码。如果用户未输入密码直接尝试解密，系统将尝试使用默认密码 "MrLee"。
6.  **后台解密 (Web Worker):**
    * 前端的 `CryptoService` 将解密任务（加密体、用户输入的密码）发送给 `crypto.worker.js`。
    * Web Worker 内部执行以下操作：
        a.  **解析加密体:** 从组合字符串中分离出盐、IV、密文和存储的 MAC 标签。
        b.  **重新派生密钥:** 使用用户提供的密码和解析出的盐，通过 PBKDF2 算法（使用与加密时相同的迭代次数和参数）重新派生出密钥，并分割为加密密钥 (KE) 和 MAC 密钥 (KM)。
        c.  **验证 MAC:** 使用 MAC 密钥 (KM)、IV 和密文重新计算 HMAC-SHA256 标签。将计算出的 MAC 标签与从加密体中解析出的存储 MAC 标签进行比较。**如果两者不一致，则表示数据被篡改或密码错误，解密过程立即终止并报错。**
        d.  **对称解密 (AES-256-CBC):** 如果 MAC 验证通过，则使用加密密钥 (KE) 和 IV，通过 AES-256-CBC 算法解密密文，得到原始的 JSON 载荷。
        e.  **解析载荷:** 从 JSON 载荷中提取出原始明文消息和内嵌的过期时间戳。
        f.  **检查内嵌过期时间:** 如果载荷中包含过期时间戳，检查当前时间是否已超过该时间。如果已过期，则提示用户。
7.  **返回明文:** Web Worker 将解密后的明文消息（或错误信息）返回给主线程的 `CryptoService`。
8.  **净化和显示:** 前端对解密得到的 Markdown 内容进行 DOMPurify XSS 净化处理，然后将其安全地渲染并显示给用户。

---

## 🚀 安装与启动 (Installation & Setup)

**后端 (Cloudflare Worker - `backend-worker` 目录):**

首先fork https://github.com/macklee6/nice
在 Cloudflare Dashboard 创建一个 KV Namespace 命名为SECRETS_KV
复制 KV Namespace 的 `id`，替换wrangler.toml中id和preview_id为刚才复制的字符串

一键部署到cloudflare
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button?projectName=nice)

选择fork修改后的项目名，部署即可，复制好worker地址

**前端 (Vue 3 + Vite):**

一键部署到vercel [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/macklee6/Easytext) 

设置好环境变量
```bash
变量名VITE_WORKER_BASE_URL
值https://你的worker地址
```
## 💡 如何使用 (How to Use)

1.  **创建密文:**
    * 打开应用主页。
    * 在文本框中输入您想要加密和分享的内容（支持 Markdown）。
    * （可选）设置一个加密密码。如果留空，将使用默认密码 "MrLee"。
    * 选择销毁方式：“阅后即焚”或“定时销毁”（并选择具体时间）。
    * 点击“生成加密链接”按钮。
2.  **分享链接:**
    * 复制生成的一次性链接。
    * **非常重要：** 将您设置的密码（或告知对方使用的是默认密码）通过安全途径告知链接的接收者。
3.  **查看密文:**
    * 接收者打开链接。
    * 输入正确的解密密码。
    * 查看解密后的内容。如果设置了“阅后即焚”，内容在首次查看后即被销毁。

---

## 📜 免责声明 (Disclaimer)

* 本软件按“原样”提供，不作任何明示或暗示的保证，包括但不限于对适销性、特定用途适用性和非侵权性的保证。
* 在任何情况下，作者或版权持有人均不对因使用本软件或与之相关的任何索赔、损害或其他责任负责，无论是在合同、侵权或其他行为中。
* **用户对其创建、存储和分享的内容的合法性、以及密码的安全性负全部责任。** 请妥善保管您的密码，一旦丢失，加密内容将无法恢复。请勿使用本工具分享非法或有害信息。
* 虽然本项目致力于提供安全的端对端加密方案，但没有任何系统是绝对安全的。请谨慎使用。

---

