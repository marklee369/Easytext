# Easy text

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) **Easy text**是一款安全的、注重隐私的临时信息分享应用。它允许用户创建受密码保护的、阅后即焚或定时销毁的加密笔记/消息，并通过生成的唯一链接进行分享。所有加密和解密操作均在用户浏览器端完成，服务器不接触任何明文内容或密码。

---

## ✨ 项目特色 (Features)

* **🛡️ 端对端加密 (End-to-End Encryption):**
    * 秘密内容在发送到服务器前已在浏览器端加密。
    * 解密操作同样在接收者的浏览器端进行。
    * 服务器仅存储加密数据，无法访问原始明文或密码。
* **💪 强密钥派生 (Strong Key Derivation):**
    * 使用 **Argon2id** 算法从用户密码派生加密密钥，有效抵抗 GPU 和 ASIC 等硬件加速的暴力破解尝试。
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
* **客户端加密库 (Client-side Encryption):**
    * **密钥派生 (Key Derivation):** `argon2-browser` (使用 Argon2id 算法)
    * **对称加密与消息认证 (Symmetric Encryption & MAC):** `crypto-js` (用于 AES-256-CBC 加密, HMAC-SHA256 消息认证)
* **Markdown 处理 (Markdown Processing):** `marked` (用于解析 Markdown), `dompurify` (用于净化 HTML 输出以防 XSS)
* **Web Workers:** 用于在后台线程执行基于 Argon2 的密钥派生、AES 加密和解密操作。

**后端 (Backend):**

* **运行环境 (Runtime):** Cloudflare Workers
* **框架 (Framework):** Hono (一个用于边缘计算的轻量级 Web 框架)
* **数据存储 (Data Storage):** Cloudflare KV (用于存储加密后的秘密内容和元数据)

---

## 🛡️ 加密与解密流程

加密流程 (发送者):
 * 输入文本与密码: 用户在浏览器中输入想要加密的明文文本内容和自定义密码。若密码为空，则使用默认密码 "MrLee"。
 * 准备加密任务: 前端应用将待加密的文本数据与一个可选的内嵌过期时间戳一起打包成一个 JSON 对象，并将其字符串化。
 * 后台加密 (Web Worker):
   * 前端的 CryptoService 将此 JSON 字符串和用户密码发送给运行在浏览器后台线程的 Web Worker (crypto.worker.js)。
   * Web Worker 内部执行以下操作：
     a.  生成随机盐 (Salt): 为本次加密生成一个唯一的、密码学安全的16字节随机盐。
     b.  派生密钥 (Argon2id): 使用 Argon2id 算法，结合用户密码和盐，并配置合适的内存成本、时间成本（迭代次数）和并行度，派生出一个高强度的64字节（512位）主密钥。
     c.  分割密钥: 将派生出的主密钥分割为两部分：32字节用作 AES-256 加密密钥 (KE)，另外32字节用作 HMAC-SHA256 认证密钥 (KM)。
     d.  对称加密 (AES-256-CBC): 生成一个随机的16字节初始向量 (IV)。使用加密密钥 (KE) 和 IV，通过 AES-256-CBC 算法加密步骤2中准备的JSON字符串载荷，得到密文。
     e.  计算消息认证码 (HMAC-SHA256): 使用 MAC 密钥 (KM)，为 IV 和密文的组合计算 HMAC-SHA256 标签 (MAC Tag)，确保数据完整性与真实性。
   * CryptoWorker 将组合后的加密体（格式：base64(盐).base64(IV).base64(密文).base64(MAC标签)）返回给主线程。
 * 发送至后端: 主线程将此加密体连同销毁选项（阅后即焚/定时）发送给后端 API (Cloudflare Worker)。
 * 后端存储: 后端 Cloudflare Worker 生成一个唯一ID，并将加密体与销毁元数据存入 Cloudflare KV。服务器本身无法解密此加密体。
 * 返回链接: 后端 API 返回包含唯一ID的秘密链接给前端。
 * 展示链接: 前端向用户展示此秘密链接。
解密流程 (接收者):
 * 访问链接: 用户通过秘密链接访问应用。
 * 获取加密数据: 前端从链接中提取唯一ID，并向后端 API 请求对应的加密体。
 * 后端处理: 后端 API 从 Cloudflare KV 中根据 ID 检索加密体。如果是“阅后即焚”，则在此时从 KV 中删除该条目。
 * 返回加密体: 后端 API 将加密体返回给前端。
 * 输入密码: 前端提示用户输入解密密码。若密码为空，则尝试使用默认密码 "MrLee"。
 * 后台解密 (Web Worker):
   * 前端将解密任务（加密体、用户输入的密码）发送给 CryptoWorker。
   * Web Worker 内部执行以下操作：
     a.  解析加密体: 从组合字符串中分离出盐、IV、密文和存储的 MAC 标签。
     b.  重新派生密钥 (Argon2id): 使用用户提供的密码和解析出的盐，通过 Argon2id 算法（使用与加密时完全相同的参数）重新派生出主密钥，并分割为加密密钥 (KE) 和 MAC 密钥 (KM)。
     c.  验证 MAC: 使用 MAC 密钥 (KM)、IV 和密文重新计算 HMAC-SHA256 标签，并与存储的 MAC 标签进行比较。若不匹配，则表示数据被篡改或密码错误，解密失败。
     d.  对称解密 (AES-256-CBC): MAC 验证通过后，使用加密密钥 (KE) 和 IV，通过 AES-256-CBC 算法解密密文，得到原始的 JSON 字符串载荷。
     e.  解析载荷: 从 JSON 字符串载荷中解析出原始文本消息和内嵌的过期时间戳。
     f.  检查内嵌过期时间: 如果载荷中包含过期时间戳，检查当前时间是否已超过该时间。如果已过期，则提示用户。
   * CryptoWorker 将解密后的文本消息（或错误信息）返回给主线程。
 * 净化和显示: 前端对解密得到的 Markdown 内容进行 DOMPurify XSS 净化处理，然后将其安全地渲染并显示给用户。
流程图 (文本秘密)
加密流程 (用户创建文本秘密时):
graph TD
    A[用户在浏览器输入<br>明文文本和密码<br>(或使用默认密码)] --> E[构建JSON载荷:<br>{类型: 'text', 消息, 内嵌过期时间}];
    E --> F[发送 (JSON载荷 + 密码)<br>至前端 Web Worker];

    subgraph 前端 Web Worker (浏览器后台线程)
        G[1. 生成随机盐 (Salt)]
        H[2. 使用 Argon2id 派生密钥<br>(密码 + Salt → 主密钥)]
        I[3. 分割主密钥<br>(AES加密密钥KE, HMAC认证密钥KM)]
        J[4. 生成随机初始向量 (IV)]
        K[5. 使用 AES-256-CBC 加密JSON载荷<br>(JSON载荷 + KE + IV → 密文)]
        L[6. 计算消息认证码 HMAC-SHA256<br>(IV + 密文 + KM → MAC标签)]
        M[7. 组合加密体<br>(Base64(Salt).Base64(IV).<br>Base64(密文).Base64(MAC))]
    end

    F --> G; G --> H; H --> I; I --> J; J --> K; K --> L; L --> M;

    M --> N[Web Worker 返回组合加密体<br>给浏览器主线程];
    N --> O[浏览器主线程发送<br>(组合加密体 + 销毁选项)<br>至后端 Cloudflare Worker API];

    subgraph 后端 Cloudflare Worker
        P[1. 接收请求, 验证数据]
        Q[2. 生成唯一的秘密ID]
        R[3. 将 (秘密ID → 组合加密体)<br>及元数据 (含TTL) 存入 Cloudflare KV]
        S[4. 返回包含秘密ID的分享链接]
    end

    O --> P; P --> Q; Q --> R; R --> S;

    S --> T[浏览器主线程显示分享链接给用户];

解密流程 (用户访问文本秘密链接时):
graph TD
    U[用户在浏览器中打开分享链接<br>(例如 .../s/秘密ID)];
    U --> V[前端从URL中提取秘密ID];
    V --> W[前端向后端 Cloudflare Worker API<br>请求加密数据 (使用秘密ID)];

    subgraph 后端 Cloudflare Worker
        X[1. 接收请求, 验证ID]
        Y[2. 从 Cloudflare KV 中检索<br>与ID对应的组合加密体和元数据]
        Z{是阅后即焚且首次访问?};
        Z -- 是 --> AA[从 KV 中删除此条目];
        Z -- 否 --> AB[直接返回];
        AA --> AB;
        AB --> AC[3. 返回组合加密体给前端]
    end

    W --> X; X --> Y; Y --> Z; AC --> AD[浏览器主线程接收组合加密体];
    AD --> AE[提示用户输入解密密码<br>(或尝试默认密码)];
    AE --> AF[发送 (组合加密体 + 密码)<br>至前端 Web Worker];

    subgraph 前端 Web Worker (浏览器后台线程)
        AG[1. 解析组合加密体<br>(分离出 Salt, IV, 密文, 存储的MAC)]
        AH[2. 使用 Argon2id 重新派生密钥<br>(密码 + Salt → 主密钥)]
        AI[3. 分割主密钥<br>(AES加密密钥KE, HMAC认证密钥KM)]
        AJ[4. 重新计算 HMAC-SHA256<br>(IV + 密文 + KM → 计算出的MAC)]
        AK{计算的MAC与存储的MAC是否一致?};
        AK -- 否 (校验失败) --> AL[返回解密错误];
        AK -- 是 (校验通过) --> AM[5. 使用 AES-256-CBC 解密密文<br>(密文 + KE + IV → JSON载荷字符串)];
        AM --> AN[6. 解析 JSON 载荷字符串];
        AN --> AO[7. 检查内嵌过期时间];
        AO -- 未过期 --> AP[返回解密后的文本消息];
        AO -- 已过期 --> AQ[返回过期错误];
    end

    AF --> AG; AG --> AH; AH --> AI; AI --> AJ; AJ --> AK;
    AL --> AR[浏览器主线程处理结果];
    AP --> AR; AQ --> AR;

    AR --> AS{解密成功且数据类型是文本?};
    AS -- 是 --> AT[1. 使用 DOMPurify 净化Markdown内容<br>2. 渲染HTML并显示];
    AS -- 否/错误 --> AV[显示错误信息给用户];


## 🚀 安装与启动 (Installation & Setup)

**后端 (Cloudflare Worker):**

首先fork https://github.com/macklee6/nice
在 Cloudflare Dashboard 创建一个 KV Namespace 命名为SECRETS_KV

复制 KV Namespace 的 `id`，替换wrangler.toml中id和preview_id为刚才复制的字符串

src/index.js中 https://text.arksec.net 替换成你vercel的域名或者自定义域名
然后，一键部署到cloudflare
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button?projectName=nice)

选择fork修改后的项目，部署即可

**前端 (Vue 3 + Vite):**

一键部署到vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/macklee6/Easytext) 

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
* 虽然本项目致力于提供安全的端对端加密方案，包括使用 Argon2id 进行密钥派生，但没有任何系统是绝对安全的。请用户自行评估风险并谨慎使用。由于密码的安全性直接影响数据的安全性，强烈建议用户为重要信息设置强壮且唯一的密码。

---

