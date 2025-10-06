<template>
  <section class="section view-secret-section">
    <div class="container">
      <div class="columns is-centered">
        <div class="column is-full-mobile is-two-thirds-tablet is-half-desktop is-one-third-widescreen">
          <div class="box secret-display-box animated-entry">

            <div v-if="viewState === 'loading'" class="has-text-centered py-6 initial-loader">
              <span class="icon is-large">
                <font-awesome-icon :icon="['fas', 'circle-notch']" size="3x" spin />
              </span>
              <p class="mt-3 loading-text">正在检索加密数据...</p>
            </div>

            <div v-else-if="viewState === 'error'" class="notification is-danger is-light custom-notification">
              <p class="icon-text">
                <span class="icon"><font-awesome-icon :icon="['fas', 'exclamation-triangle']" /></span>
                <span>{{ generalError }}</span>
              </p>
              <router-link to="/" class="button is-primary is-light mt-4 is-fullwidth">返回创建</router-link>
            </div>

            <div v-else-if="viewState === 'prompting'" class="password-prompt-panel" :class="{'is-processing': isDecrypting}">
              <div v-if="isDecrypting" class="form-loading-overlay">
                <div class="loader-icon">
                  <font-awesome-icon :icon="['fas', 'circle-notch']" spin size="3x" />
                </div>
                <p class="loading-text-overlay">正在解密数据...</p>
              </div>
              <div class="view-content-wrapper">
                <div class="has-text-centered mb-5">
                  <span class="icon is-large brand-icon-page">
                    <font-awesome-icon :icon="['fas', 'lock-open']" size="3x" />
                  </span>
                  <h1 class="title is-3 has-text-centered is-spaced mt-3 page-title">安全访问</h1>
                  <p class="subtitle is-6 has-text-centered form-subtitle mb-4">请输入密码以解密内容。</p>
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
                    :disabled="isDecrypting"
                  >
                    <span v-if="!isDecrypting" class="icon is-small mr-1"><font-awesome-icon :icon="['fas', 'shield-halved']" /></span>
                    <span>{{ isDecrypting ? "解密中..." : "解密并查看" }}</span>
                  </button>
                </div>
              </div>
            </div>

            <div v-else-if="viewState === 'success'" class="decrypted-content-panel animated-entry">
              <h2 class="title is-4 has-text-centered page-title">解密内容</h2>
              <div ref="contentContainer" class="markdown-body p-4 my-5" v-html="renderedMarkdown"></div>
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
  </section>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { cryptoService } from '../services/cryptoService';
import { apiService } from '../services/apiService';
import { markdownService } from '../services/markdownService';
const props = defineProps({
  secretId: { type: String, required: true }
});

const viewState = ref('loading');
const isDecrypting = ref(false);

const encryptedPayloadFromServer = ref('');
const secretMetadata = ref(null);
const viewPassword = ref('');
const showPassword = ref(false);
const decryptedMessage = ref('');
const generalError = ref('');
const decryptionError = ref('');
const contentContainer = ref(null);

const defaultPasswordValue = "MrLee";

const renderedMarkdown = computed(() => {
  return markdownService.render(decryptedMessage.value);
});

const formatExpiryOption = (option) => {
  const map = { '5min': '5分钟', '30min': '30分钟', '1hour': '1小时', '6hour': '6小时', '1day': '1天' };
  return map[option] || option;
};

const resetComponentState = () => {
  viewState.value = 'loading';
  isDecrypting.value = false;
  encryptedPayloadFromServer.value = '';
  secretMetadata.value = null;
  viewPassword.value = '';
  decryptedMessage.value = '';
  generalError.value = '';
  decryptionError.value = '';
};

const fetchSecretData = async (id) => {
  if (!id) {
    generalError.value = "无效的密文链接或ID缺失。";
    viewState.value = 'error';
    return;
  }
  
  resetComponentState();

  try {
    const result = await apiService.getSecret(id);
    encryptedPayloadFromServer.value = result.encryptedPayload;
    secretMetadata.value = result.metadata;
    viewState.value = 'prompting';
  } catch (e) {
    generalError.value = e.message || "无法获取密文。可能已销毁、链接无效或网络错误。";
    viewState.value = 'error';
  }
};

const handleDecrypt = async () => {
  decryptionError.value = '';
  isDecrypting.value = true;
  
  const passwordToTry = viewPassword.value.trim() === '' ? defaultPasswordValue : viewPassword.value;

  try {
    const payload = await cryptoService.decrypt(encryptedPayloadFromServer.value, passwordToTry);
    
    if (payload?.type === 'text' && typeof payload.message === 'string') {
      decryptedMessage.value = payload.message;
      viewState.value = 'success';
    } else {
      throw new Error("解密成功，但返回的数据结构不正确。");
    }
  } catch (e) {
    decryptionError.value = e.message || "解密失败，请仔细检查您的密码。";
  } finally {
    isDecrypting.value = false;
  }
};

onMounted(() => {
  fetchSecretData(props.secretId);
});

watch(() => props.secretId, (newId) => {
  if (newId) {
    fetchSecretData(newId);
  }
});

watch(viewState, (newState) => {
  if (newState === 'success') {
    nextTick(() => {
      if (contentContainer.value) {
        const blocks = contentContainer.value.querySelectorAll('pre code');
        blocks.forEach((block) => {
          hljs.highlightElement(block);
        });
      }
    });
  }
});
</script>

<style scoped lang="scss">
.view-secret-section {
  padding-top: 6rem;
  padding-bottom: 3rem;
  @media screen and (max-width: 768px) {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
}
.secret-display-box {
  background-color: var(--bulma-card-background-color);
  border: 1px solid var(--bulma-border);
  border-radius: var(--bulma-radius-large);
  padding: 2rem 2.5rem;
  position: relative;
  transition: filter 0.3s ease-out;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  max-width: 680px;
  @media screen and (max-width: 768px) {
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 1.5rem;
    padding-bottom: 1.5rem;
  }
  @media screen and (min-width: 1024px) {
    max-width: 760px;
    padding: 2rem 2.5rem;
  }
  @media screen and (min-width: 1408px) {
    max-width: 800px;
  }
}
.password-prompt-panel.is-processing {
  .view-content-wrapper {
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
  word-wrap: break-word;
  white-space: pre-wrap;
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
</style>

<style>
/* highlight.js 样式会影响全局，
  但我们只在 .markdown-body 容器内渲染代码块，
  所以可以通过添加父选择器来约束样式的作用范围，避免污染全局。
*/
.markdown-body .hljs {
  border-radius: 6px;
}
</style>
