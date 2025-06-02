<template>
  <section class="section create-secret-section">
    <div class="container">
      <div class="columns is-centered">
        <div class="column is-full-mobile is-two-thirds-tablet is-half-desktop is-one-third-widescreen">
          <div class="box secret-form-box animated-entry" :class="{'is-processing': isLoading}">
            <div v-if="isLoading" class="form-loading-overlay">
              <div class="loader-icon">
                 <font-awesome-icon :icon="['fas', 'circle-notch']" spin size="3x" />
              </div>
              <p class="loading-text-overlay">正在加密并生成链接...</p>
            </div>

            <div class="form-content-wrapper">
              <div class="has-text-centered mb-5">
                <span class="icon is-large brand-icon-page">
                  <font-awesome-icon :icon="['fas', 'shield-halved']" size="3x" />
                </span>
                <h1 class="title is-3 has-text-centered is-spaced mt-3 page-title">创建安全密文</h1>
                <p class="subtitle is-6 has-text-centered form-subtitle mb-5">
                  信息将被端对端加密存储，可设置阅后即焚或定时销毁。
                </p>
              </div>

              <div class="field">
                <label class="label" for="message">
                  密文内容 <span class="label-extra-info">(支持 Markdown)</span>
                </label>
                <div class="control">
                  <textarea 
                    id="message" 
                    class="textarea is-medium tech-input" 
                    :class="{'is-danger': messageError}" 
                    rows="7" 
                    v-model="message" 
                    placeholder="在此输入您的秘密信息..."
                  ></textarea>
                 <p v-if="messageError" class="help is-danger mt-1">{{ messageError }}</p>
              </div>
            </div>

            <div class="field">
              <label class="label" for="password">加密密码 <span class="label-extra-info">(可选, 留空则使用默认密码)</span></label>
              <div class="control has-icons-left has-icons-right">
                <input 
                    id="password" 
                    class="input is-medium tech-input" 
                    :class="{'is-danger': passwordError}"
                    :type="showPassword ? 'text' : 'password'" 
                    v-model="password" 
                    placeholder="至少8位，或留空使用默认密码"
                    autocomplete="new-password"
                >
                <span class="icon is-small is-left"><font-awesome-icon :icon="['fas', 'lock']" /></span>
                <span class="icon is-right is-clickable password-toggle-icon" @click="showPassword = !showPassword">
                   <font-awesome-icon :icon="showPassword ? ['fas', 'eye-slash'] : ['fas', 'eye']" />
                </span>
              </div>
              <p v-if="passwordError" class="help is-danger mt-1">{{ passwordError }}</p>
            </div>

            <div class="field">
              <label class="label">销毁方式</label>
              <div class="control destruction-options-container">
                <div class="destruction-options">
                  <label class="radio tech-radio">
                    <input type="radio" name="destructionType" value="readOnce" v-model="destructionType">
                    <span class="radio-label"><font-awesome-icon :icon="['fas', 'eye']" class="mr-1"/>阅后即焚</span>
                  </label>
                  <label class="radio tech-radio">
                    <input type="radio" name="destructionType" value="timed" v-model="destructionType">
                    <span class="radio-label"><font-awesome-icon :icon="['fas', 'hourglass-half']" class="mr-1"/>定时销毁</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="field" v-if="destructionType === 'timed'">
              <label class="label" for="expiry">销毁时间 <span class="label-extra-info">(从创建时算起)</span></label>
              <div class="control">
                <div class="select is-fullwidth is-medium tech-select">
                  <select id="expiry" v-model="expiryOption">
                    <option value="5min">5 分钟</option>
                    <option value="30min">30 分钟</option>
                    <option value="1hour">1 小时</option>
                    <option value="6hour">6 小时</option>
                    <option value="1day">1 天</option>
                  </select>
                </div>
              </div>
            </div>
            <hr class="form-divider my-5">
            <div class="field">
              <div class="control">
                <button 
                  class="button is-primary is-fullwidth is-large submit-button" 
                  @click="handleCreateSecret" 
                  :disabled="isLoading" 
                  :class="{'is-loading': isLoading && !showOverlayLoader}"
                >
                  <span v-if="!isLoading" class="icon is-small mr-1"><font-awesome-icon :icon="['fas', 'fingerprint']" /></span>
                  <span>{{ isLoading ? "处理中..." : "生成加密链接" }}</span>
                </button>
              </div>
            </div>
            </div> 

            <div v-if="generalError && !isLoading" class="notification is-danger is-light mt-4 custom-notification">
              <button class="delete" @click="generalError = ''"></button>
              <span class="icon-text">
                <span class="icon"><font-awesome-icon :icon="['fas', 'exclamation-triangle']" /></span>
                <span>{{ generalError }}</span>
              </span>
            </div>

            <div v-if="secretLink && !isLoading" class="notification is-success is-light mt-5 custom-notification result-panel animated-entry">
               <button class="delete" @click="clearSecretLinkState"></button>
              <h4 class="title is-5 result-title">链接已生成！</h4>
              <p class="result-subtitle">请复制并分享此链接。链接和内容将在指定条件下销毁。</p>
              <div class="field has-addons mt-3">
                <div class="control is-expanded">
                  <input class="input is-medium result-link-input" type="text" :value="secretLink" readonly ref="linkInputRef">
                </div>
                <div class="control">
                  <button class="button is-info is-medium copy-button" @click="copyLink">
                    <span class="icon is-small"><font-awesome-icon :icon="copyIcon" /></span>
                    <span>{{ copyButtonText }}</span>
                  </button>
                </div>
              </div>
              <p class="is-size-7 mt-2 password-disclosure">
                <strong>重要:</strong> 请务必将 
                <strong class="password-emphasis">{{ usedPasswordForDisplay }}</strong> 
                安全地告知接收者。
              </p>
              <div v-if="isDefaultPasswordUsed" class="mt-2 is-size-7 default-password-notice">
                <span class="icon-text">
                  <span class="icon"><font-awesome-icon :icon="['fas', 'exclamation-triangle']" /></span>
                  <span>您未设置密码，已使用默认密码 "{{ defaultPasswordValue }}" 加密。</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { cryptoService } from '../services/cryptoService';
import { apiService } from '../services/apiService';

const message = ref('');
const password = ref('');
const showPassword = ref(false);
const destructionType = ref('readOnce');
const expiryOption = ref('1hour'); // 默认1天，确保与 getExpiryTimestampForPayload 中的 default 匹配

const isLoading = ref(false);
const showOverlayLoader = ref(true); 

const generalError = ref('');
const messageError = ref('');
const passwordError = ref('');

const secretLink = ref('');
const linkInputRef = ref(null);
const copyButtonText = ref('复制');
const copyIcon = ref(['fas', 'copy']);

const defaultPasswordValue = "MrLee";
const actualUsedPassword = ref(''); 

const isDefaultPasswordUsed = computed(() => actualUsedPassword.value === defaultPasswordValue);
const usedPasswordForDisplay = computed(() => {
  if (!actualUsedPassword.value) return "";
  return isDefaultPasswordUsed.value ? `默认密码 "${defaultPasswordValue}"` : "您设置的加密密码";
});

const isFormValid = () => {
  let valid = true;
  messageError.value = '';
  passwordError.value = '';

  if (message.value.trim() === '') {
    messageError.value = "密文内容不能为空。";
    valid = false;
  }
  if (password.value && password.value.length > 0 && password.value.length < 8) {
    passwordError.value = "密码至少需要8个字符（或留空使用默认密码）。";
    valid = false;
  }
  return valid;
};

function getExpiryTimestampForPayload() {
  const now = Date.now(); // 当前 UTC 时间戳 (毫秒)
  let durationMs;

  console.log(`CreateSecretView: 当前销毁类型 = ${destructionType.value}, 当前过期选项 = ${expiryOption.value}`);

  if (destructionType.value === 'timed') {
    switch (expiryOption.value) {
      case '5min': durationMs = 5 * 60 * 1000; break;
      case '30min': durationMs = 30 * 60 * 1000; break;
      case '1hour': durationMs = 60 * 60 * 1000; break;
      case '6hour': durationMs = 6 * 60 * 1000; break;
      case '1day': durationMs = 24 * 60 * 60 * 1000; break;
      default: 
        console.warn(`CreateSecretView: 未知的 expiryOption '${expiryOption.value}'，默认为1天。`);
        durationMs = 24 * 60 * 60 * 1000; 
    }
  } else { // 'readOnce' (阅后即焚)
    durationMs = 24 * 60 * 60 * 1000; // 内嵌1天作为后备
    console.log("CreateSecretView: 销毁类型为阅后即焚，内嵌过期时间设置为24小时。");
  }
  const expiryTimestamp = now + durationMs; 

  console.log(`CreateSecretView: 当前时间 (UTC ms): ${now} (${new Date(now).toISOString()})`);
  console.log(`CreateSecretView: 选择的持续时间 (ms): ${durationMs}`);
  console.log(`CreateSecretView: 计算得到的过期时间戳 (UTC ms): ${expiryTimestamp} (${new Date(expiryTimestamp).toISOString()})`);
  
  return expiryTimestamp;
}

async function handleCreateSecret() {
  generalError.value = ''; 
  if (!isFormValid()) {
    return;
  }

  isLoading.value = true; 
  secretLink.value = ''; 
  actualUsedPassword.value = password.value.trim() === '' ? defaultPasswordValue : password.value;

  await nextTick(); 

  try {
    const embeddedExpiryTimestamp = getExpiryTimestampForPayload(); 
    
    console.log("CreateSecretView: 调用 cryptoService.encrypt，将内嵌 expiryTimestamp:", embeddedExpiryTimestamp, `(${new Date(embeddedExpiryTimestamp).toISOString()})`);

    const finalEncryptedPayload = await cryptoService.encrypt(
        message.value, 
        actualUsedPassword.value, 
        embeddedExpiryTimestamp 
    );
    
    const readOnceFlag = destructionType.value === 'readOnce';
    const apiExpiryOption = readOnceFlag ? '1day' : expiryOption.value;

    const result = await apiService.createSecret(finalEncryptedPayload, apiExpiryOption, readOnceFlag);
    const currentBaseUrl = window.location.origin;
    secretLink.value = `${currentBaseUrl}/s/${result.secretId}`;

  } catch (e) {
    console.error("Create secret error:", e);
    generalError.value = e.message || "创建密文失败，请稍后再试。";
  } finally {
    isLoading.value = false; 
  }
}

function clearSecretLinkState() {
  secretLink.value = '';
  actualUsedPassword.value = '';
}

function copyLink() {
  if (linkInputRef.value && secretLink.value) {
    linkInputRef.value.select();
    try {
      navigator.clipboard.writeText(secretLink.value);
      copyButtonText.value = '已复制!';
      copyIcon.value = ['fas', 'check-circle'];
      
      setTimeout(() => { 
        clearSecretLinkState(); 
      }, 1500);

    } catch (err) {
      console.error('Failed to copy link: ', err);
      generalError.value = "复制链接失败。请尝试手动复制。";
      copyButtonText.value = '复制';
      copyIcon.value = ['fas', 'copy'];
    }
  }
}
</script>

<style scoped lang="scss">
.create-secret-section {
  padding-top: 3.6rem; /* 保持您代码中的值 */
  padding-bottom: 3rem;

  @media screen and (max-width: 768px) {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
}
.secret-form-box {
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

.secret-form-box.is-processing {
  .form-content-wrapper { 
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

.form-content-wrapper { 
  transition: filter 0.2s ease, opacity 0.2s ease;
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
.tech-input, .tech-select select {
  font-family: var(--tech-font-family-sans); 
}
.tech-select select {
  font-family: var(--tech-font-family-sans); 
}
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

.destruction-options-container { 
  display: flex;
  justify-content: center; 
}
.destruction-options {
  display: inline-flex; 
  align-items: center;
  flex-wrap: nowrap; 
  gap: 0.75rem;     
  padding-bottom: 5px; 
  max-width: 100%; 
  overflow-x: auto; 
  -webkit-overflow-scrolling: touch; 
  scrollbar-width: none; 
  &::-webkit-scrollbar { 
    display: none;
  }

  .tech-radio {
    flex-shrink: 1; 
    min-width: 0; 
  }

  .radio-label {
    padding: 0.4em 0.6em 0.4em 1.7em; 
    font-size: 0.85rem; 
    white-space: nowrap; 

    .svg-inline--fa { 
        margin-right: 0.3em;
    }
    &:before { left: 0.3em; width: 13px; height: 13px; top: calc(50% - 7.5px); }
    &:after { left: calc(0.3em + 2.5px); top: calc(50% - 4px); width: 8px; height: 8px; } 
  }
}

@media screen and (max-width: 360px) { 
  .destruction-options {
    flex-wrap: wrap; 
    justify-content: center; 
    gap: 0.5rem;
    .tech-radio {
      margin-bottom: 0.5rem; 
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

.tech-radio input[type="radio"] { 
  opacity: 0; width: 0; height: 0; 
  & + .radio-label {
    position: relative;
    cursor: pointer;
    color: var(--bulma-text);
    border: 1px solid var(--bulma-border);
    border-radius: var(--bulma-radius);
    transition: all 0.2s ease;
    display: inline-flex; 
    align-items: center;

    &:before { 
      content: '';
      position: absolute;
      border: 2px solid var(--bulma-border);
      border-radius: 50%;
      background: transparent; 
      transition: border-color 0.2s ease;
    }
    &:after { 
      content: '';
      position: absolute;
      border-radius: 50%;
      background: var(--primary-color);
      transform: scale(0);
      transition: transform 0.2s ease;
    }
  }
  &:hover + .radio-label {
    border-color: var(--primary-color);
  }
  &:checked + .radio-label {
    border-color: var(--primary-color);
    background-color: color-mix(in srgb, var(--primary-color) 10%, var(--bulma-card-background-color));
    color: var(--bulma-text-strong);
    .svg-inline--fa { color: var(--primary-color); }
    &:before {
      border-color: var(--primary-color);
    }
    &:after {
      transform: scale(1);
    }
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
.result-panel { }
.result-title { 
  color: var(--bulma-success-strong); 
  font-family: var(--tech-font-family-mono, monospace);
}
.result-subtitle { 
  color: var(--bulma-text-light);
}
.result-link-input { 
  font-family: var(--tech-font-family-mono, monospace);
  font-size: 0.9rem;
  background-color: color-mix(in srgb, var(--bulma-info) 5%, var(--bulma-input-background-color));
  border-color: var(--bulma-info);
}
.copy-button .svg-inline--fa { 
  color: var(--bulma-info-invert); 
}

.password-disclosure {
  color: var(--bulma-text-light);
  .password-emphasis {
    color: var(--view-password-disclosure-danger-text, var(--bulma-danger)); 
    font-weight: 600;
  }
}
.default-password-notice {
  color: var(--view-default-password-notice-warning-text, var(--bulma-warning));
  .icon {
    vertical-align: middle; 
  }
}
.help {
  font-size: 0.8rem; 
  font-family: var(--tech-font-family-sans);
}
</style>

