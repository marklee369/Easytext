<template>
  <section class="section view-secret-section">
    <div class="container">
      <div class="columns is-centered">
        <div class="column is-full-mobile is-two-thirds-tablet is-half-desktop is-one-third-widescreen">
          <div class="box secret-display-box animated-entry" :class="{'is-processing': isDecrypting}">
            <div v-if="isDecrypting" class="form-loading-overlay">
              <div class="loader-icon">
                 <font-awesome-icon :icon="['fas', 'circle-notch']" spin size="3x" />
              </div>
              <p class="loading-text-overlay">正在解密数据...</p>
            </div>

            <div class="view-content-wrapper">
              <div v-if="isLoadingInitial" class="has-text-centered py-6 initial-loader">
                <span class="icon is-large">
                  <font-awesome-icon :icon="['fas', 'circle-notch']" size="3x" spin />
                </span>
                <p class="mt-3 loading-text">正在检索加密数据...</p>
              </div>

              <div v-else-if="generalError && !isDecrypting" class="notification is-danger is-light mt-4 custom-notification">
                <button class="delete" @click="clearError"></button>
                <p class="icon-text">
                  <span class="icon"><font-awesome-icon :icon="['fas', 'exclamation-triangle']" /></span>
                  <span>{{ generalError }}</span>
                </p>
                <router-link to="/" class="button is-primary is-light mt-4 is-fullwidth">返回创建</router-link>
              </div>
              
              <div v-else-if="!encryptedPayloadFromServer && !decryptedData.type && !isDecrypting" class="notification is-warning is-light custom-notification">
                <p>链接中未找到有效加密数据或数据已失效。</p>
                <router-link to="/" class="button is-primary is-light mt-4 is-fullwidth">返回创建</router-link>
              </div>

              <div v-else-if="!decryptedData.type" class="password-prompt-panel">
                <div class="has-text-centered mb-5">
                  <span class="icon is-large brand-icon-page">
                    <font-awesome-icon :icon="['fas', 'lock-open']" size="3x" />
                  </span>
                  <h1 class="title is-3 has-text-centered is-spaced mt-3 page-title">安全访问</h1>
                  <p class="subtitle is-6 has-text-centered form-subtitle mb-4">
                    请输入密码以解密内容。
                  </p>
                </div>

                <div v-if="secretMetadata?.readOnce" class="notification is-warning is-light is-size-7 p-3 mb-4 custom-notification-inline">
                  <span class="icon-text">
                    <span class="icon"><font-awesome-icon :icon="['fas', 'eye']" /></span>
                    <span>此为阅后即焚密文，查看后将从服务器永久删除。</span>
                  </span>
                </div>
                <div v-if="!secretMetadata?.readOnce && secretMetadata?.userExpiryOption" class="notification is-info is-light is-size-7 p-3 mb-4 custom-notification-inline">
                  <span class="icon-text">
                    <span class="icon"><font-awesome-icon :icon="['fas', 'hourglass-half']" /></span>
                    <span>此密文设置为 {{ formatExpiryOption(secretMetadata.userExpiryOption) }} 后销毁。</span>
                  </span>
                </div>

                <div class="field">
                  <label class="label" for="viewPassword">解密密码 <span class="label-extra-info">(留空则尝试默认密码)</span></label>
                  <div class="control has-icons-left has-icons-right">
                    <input 
                      id="viewPassword" 
                      class="input is-medium tech-input" 
                      :class="{'is-danger': decryptionError}"
                      :type="showPassword ? 'text' : 'password'" 
                      v-model="viewPassword" 
                      @keyup.enter="handleDecrypt" 
                      placeholder="输入解密密码"
                      autocomplete="current-password"
                    >
                    <span class="icon is-small is-left"><font-awesome-icon :icon="['fas', 'key']" /></span>
                    <span class="icon is-right is-clickable password-toggle-icon" @click="showPassword = !showPassword">
                      <font-awesome-icon :icon="showPassword ? ['fas', 'eye-slash'] : ['fas', 'eye']" />
                    </span>
                  </div>
                  <p v-if="decryptionError" class="help is-danger mt-1">{{ decryptionError }}</p>
                </div>
                <hr class="form-divider my-5">
                <div class="field">
                  <button 
                    class="button is-primary is-fullwidth is-large submit-button" 
                    @click="handleDecrypt" 
                    :disabled="isDecrypting || !encryptedPayloadFromServer"
                    :class="{'is-loading': isDecrypting && !showOverlayLoader}" 
                  >
                    <span v-if="!isDecrypting" class="icon is-small mr-1"><font-awesome-icon :icon="['fas', 'shield-halved']" /></span>
                    <span>{{ isDecrypting ? "解密中..." : "解密并查看" }}</span>
                  </button>
                </div>
              </div>

              <div v-else class="decrypted-content-panel animated-entry">
                <div v-if="decryptedData.type === 'text'">
                  <h2 class="title is-4 has-text-centered page-title">解密内容</h2>
                  <div class="markdown-body p-4 my-5" v-html="renderedMarkdown"></div>
                </div>
                <div v-if="decryptedData.type === 'file'" class="has-text-centered">
                  <h2 class="title is-4 page-title">文件已解密</h2>
                  <p class="mb-2">文件名: <strong>{{ decryptedData.filename }}</strong></p>
                  <p class="mb-4">类型: <span class="tag is-info is-light">{{ decryptedData.filetype || '未知' }}</span></p>
                  <p v-if="decryptedData.description" class="content is-size-6 file-description mb-4">
                    <strong>描述:</strong><br/>
                    <span v-html="markdownService.render(decryptedData.description)"></span>
                  </p>
                  <button class="button is-success is-large is-fullwidth download-button" @click="triggerFileDownload">
                    <span class="icon"><font-awesome-icon :icon="['fas', 'download']" /></span>
                    <span>下载文件</span>
                  </button>
                </div>
                <hr class="form-divider my-4">
                <p class="is-size-7 has-text-grey has-text-centered footer-notice">
                  此密文已被读取。{{ secretMetadata?.readOnce ? "它已从服务器删除。" : "请妥善保管您的信息。" }}
                </p>
                <router-link to="/" class="button is-link is-light mt-4 is-fullwidth">创建新密文</router-link>
              </div>
            </div> 
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { cryptoService } from '../services/cryptoService';
import { apiService } from '../services/apiService';
import { markdownService } from '../services/markdownService';

const props = defineProps({
  secretId: { type: String, required: true, }
});

const router = useRouter();

const encryptedPayloadFromServer = ref('');
const secretMetadata = ref(null);
const viewPassword = ref('');
const showPassword = ref(false);

// decryptedData 现在直接存储从 service 返回的解析后的对象
const decryptedData = ref({}); 
const renderedMarkdown = computed(() => {
  if (decryptedData.value && decryptedData.value.type === 'text' && typeof decryptedData.value.message === 'string') {
    return markdownService.render(decryptedData.value.message);
  }
  return '';
});

const isLoadingInitial = ref(true);
const isDecrypting = ref(false); 
const showOverlayLoader = ref(true); 

const generalError = ref('');
const decryptionError = ref('');

const defaultPasswordValue = "MrLee";

function clearError() {
    generalError.value = '';
    decryptionError.value = '';
}

function formatExpiryOption(option) {
    const map = { '5min': '5分钟', '30min': '30分钟', '1hour': '1小时', '6hour': '6小时', '1day': '1天' };
    return map[option] || option;
}

async function fetchSecretData(id) {
  isLoadingInitial.value = true;
  generalError.value = '';
  decryptedData.value = {}; // 清空之前的解密数据
  try {
    const result = await apiService.getSecret(id);
    encryptedPayloadFromServer.value = result.encryptedPayload;
    secretMetadata.value = result.metadata;
  } catch (e) {
    console.error("Get secret error:", e);
    generalError.value = e.message || "无法获取密文。可能已销毁、链接无效或网络错误。";
    encryptedPayloadFromServer.value = ''; 
    secretMetadata.value = null;
  } finally {
    isLoadingInitial.value = false;
  }
}

onMounted(() => {
  if (props.secretId) {
    fetchSecretData(props.secretId);
  } else {
    generalError.value = "无效的密文链接或ID缺失。";
    isLoadingInitial.value = false;
  }
});

watch(() => props.secretId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    viewPassword.value = ''; 
    decryptedData.value = {}; 
    generalError.value = ''; 
    decryptionError.value = ''; 
    fetchSecretData(newId); 
  }
});

async function handleDecrypt() {
  decryptionError.value = '';
  const actualPasswordToTry = viewPassword.value.trim() === '' ? defaultPasswordValue : viewPassword.value;

  if (!encryptedPayloadFromServer.value) {
    generalError.value = "未加载加密数据，无法解密。请刷新或检查链接。";
    return;
  }

  isDecrypting.value = true; 
  
  await nextTick(); 

  try {
    // cryptoService.decrypt 现在直接返回解析后的对象
    const payloadObject = await cryptoService.decrypt(encryptedPayloadFromServer.value, actualPasswordToTry);
    decryptedData.value = payloadObject; // <--- 修改点：直接赋值对象，不再 JSON.parse()
  } catch (e) {
    console.error("Decrypt error:", e);
    decryptionError.value = e.message || "解密失败，请仔细检查您的密码。";
    decryptedData.value = {}; // 清空解密数据
  } finally {
    isDecrypting.value = false; 
  }
}

function triggerFileDownload() {
  if (decryptedData.value.type === 'file' && decryptedData.value.content_base64) {
    const { filename, filetype, content_base64 } = decryptedData.value;
    try {
      const byteCharacters = atob(content_base64); 
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: filetype || 'application/octet-stream' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename || 'downloaded_file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href); 
    } catch (e) {
      console.error("Error triggering download:", e);
      generalError.value = "文件下载失败：" + e.message;
    }
  } else {
    generalError.value = "没有有效的文件数据可供下载。";
  }
}
</script>

<style scoped lang="scss">
/* 样式部分与上一版本（包含跳动光效和解密加载动画）完全相同 */
.view-secret-section {
  padding-top: 6rem;
  padding-bottom: 3rem;
}
.secret-display-box {
  background-color: var(--bulma-card-background-color); 
  border: 1px solid var(--bulma-border);
  border-radius: var(--bulma-radius-large); 
  padding: 2rem 2.5rem; 
  position: relative; 
  transition: filter 0.3s ease-out;
}

.secret-display-box.is-processing {
  .password-prompt-panel { 
    filter: blur(3px) opacity(0.6);
    pointer-events: none;
    transition: filter 0.2s ease, opacity 0.2s ease;
  }
}

.form-loading-overlay { 
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-color: hsla(220, 22%, 16%, 0.85);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10; 
  border-radius: var(--bulma-radius-large); 
  opacity: 0;
  animation: fadeInOverlay 0.2s 0.1s ease-out forwards;
  pointer-events: auto;
}
@keyframes fadeInOverlay {
  to { opacity: 1; }
}
.loader-icon .svg-inline--fa { 
  color: var(--primary-color);
  filter: drop-shadow(0 0 8px var(--tech-glow-color));
}
.loading-text-overlay {
  margin-top: 1.5rem;
  font-family: var(--tech-font-family-mono, monospace);
  color: var(--bulma-text-light);
  font-size: 1rem;
  letter-spacing: 0.5px;
}

.view-content-wrapper { 
  transition: filter 0.2s ease, opacity 0.2s ease;
}


.initial-loader .svg-inline--fa {
  color: var(--primary-color);
}
.loading-text {
  font-family: var(--tech-font-family-mono, monospace);
  color: var(--bulma-text-light);
}

.brand-icon-page { 
  display: inline-block;
  position: relative; 
  width: 48px; 
  height: 48px;
  line-height: 48px; 
  text-align: center; 
  vertical-align: middle;
  .svg-inline--fa {
    vertical-align: middle; 
  }
}
.brand-icon-page .svg-inline--fa { 
  color: var(--primary-color);
  animation: pulse-glow 2.5s infinite ease-in-out; 
  transform-origin: center center; 
  position: relative; 
  z-index: 1; 
}
.brand-icon-page.is-static .svg-inline--fa { 
    animation: none;
    filter: drop-shadow(0 0 5px var(--tech-glow-color)); 
}

@keyframes pulse-glow {
  0%, 100% {
    transform: scale(1);
    filter: drop-shadow(0 0 5px var(--tech-glow-color, hsla(180, 100%, 70%, 0.3))) 
            drop-shadow(0 0 2px var(--primary-color, hsl(180, 100%, 55%)));
    opacity: 0.9;
  }
  50% {
    transform: scale(1.08); 
    filter: drop-shadow(0 0 12px var(--tech-glow-color, hsla(180, 100%, 70%, 0.5))) 
            drop-shadow(0 0 6px var(--primary-color, hsl(180, 100%, 55%))); 
    opacity: 1;
  }
}


.page-title {
  color: var(--bulma-text-strong);
  font-family: var(--tech-font-family, 'IBM Plex Mono', monospace);
  letter-spacing: 0.5px;
}
.form-subtitle {
  color: var(--bulma-text-light);
  font-size: 0.95rem;
}
.label {
  color: var(--bulma-text-strong);
  font-weight: 500; 
  font-size: 0.9rem; 
  text-transform: uppercase; 
  letter-spacing: 0.5px;
}
.label-extra-info {
  color: var(--bulma-text-light);
  font-weight: 400;
  text-transform: none; 
  font-size: 0.8rem;
  margin-left: 0.5em;
}
.tech-input { }
.password-toggle-icon {
  height: 100% !important; 
  width: 2.5em !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--bulma-text-light);
  &:hover {
    color: var(--primary-color);
  }
}
.form-divider {
  background-image: linear-gradient(to right, transparent, var(--tech-border-color), transparent);
  height: 1px;
  border: 0;
}
.submit-button {
  font-weight: 500;
  letter-spacing: 0.8px; 
  text-transform: uppercase; 
  &.is-loading::after {
    border-color: transparent transparent var(--bulma-primary-invert) var(--bulma-primary-invert) !important;
  }
}
.custom-notification {
  border-radius: var(--bulma-radius);
  border-left-width: 4px;
  padding: 1rem 1.5rem;
}
.custom-notification-inline { 
  background-color: color-mix(in srgb, var(--bulma-scheme-main-bis, var(--bulma-body-background-color)) 70%, transparent);
  border: 1px solid var(--bulma-border-light, var(--bulma-border));
  &.is-warning {
    border-left-color: var(--bulma-warning);
  }
  &.is-info {
    border-left-color: var(--bulma-info);
  }
}
.markdown-body { 
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
}
.footer-notice {
  font-family: var(--tech-font-family-mono, monospace);
  color: var(--bulma-text-light);
}
.animated-entry { 
  opacity: 0;
  transform: translateY(15px) scale(0.98);
  animation: fadeInUpMoreView 0.5s 0.1s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
}
@keyframes fadeInUpMoreView { 
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.file-description {
  background-color: var(--bulma-code-background);
  border: 1px solid var(--bulma-border-light);
  border-radius: var(--bulma-radius);
  padding: 1em;
  margin-bottom: 1.5em;
  max-height: 150px; 
  overflow-y: auto;  
  text-align: left;
}
.download-button .svg-inline--fa {
  margin-right: 0.5em;
}
</style>

