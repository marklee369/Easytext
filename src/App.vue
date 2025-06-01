<template>
  <div id="app-container">
    <Navbar />
    <main class="container is-fluid py-5 px-4 main-content-area">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <footer class="footer app-footer">
      <div class="content has-text-centered">
        <p class="footer-text">
          Made with 
          <span class="icon beating-heart-container">
            <font-awesome-icon :icon="['fas', 'heart']" class="beating-heart"/>
          </span>
          by &nbsp  
          <a href="https://github.com/macklee6/Easytext" target="_blank" rel="noopener noreferrer" class="footer-link">
            Macklee6/Easytext </a>.
        </p>
        <p class="footer-copyright">
          &copy; {{ currentYear }} Encrypt Pro. All Rights Reserved.
        </p>
        <p class="is-size-7 mt-2 built-with-love">
          安全分享，保护隐私。
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import Navbar from './components/Navbar.vue';
import { computed } from 'vue';

const currentYear = computed(() => new Date().getFullYear());
</script>

<style lang="scss">
/* 全局样式，已在 main.scss 中定义或继承 */
#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bulma-body-background-color); /* 确保容器背景与body一致 */
}
.main-content-area {
  flex-grow: 1;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Footer 特定样式 */
.app-footer {
  background-color: var(--bulma-footer-background-color);
  border-top: 1px solid var(--navbar-border-color); /* 与 navbar 统一的边框颜色 */
  color: var(--bulma-text-light); /* Footer 默认文字颜色 */

  .footer-text {
    font-size: 0.9rem;
    display: inline-flex; 
    align-items: center;
    justify-content: center;
    margin-bottom: 0.5rem; 
  }

  .beating-heart-container {
    display: inline-flex;
    align-items: center;
    margin: 0 0.4em; /* 红心左右的间距 */
  }

  .beating-heart .svg-inline--fa { 
    color: var(--bulma-danger); /* 使用危险/红色系，确保这个变量在深色主题下是亮的 */
    animation: heartBeat 1.33s ease-in-out infinite;
    font-size: 0.9em; 
    vertical-align: middle; 
  }

  .footer-link {
    color: var(--primary-color); /* 使用主题强调色 */
    font-weight: 500; 
    text-decoration: none;
    border-bottom: 1px solid transparent; 
    transition: color 0.2s ease, border-color 0.2s ease;
    &:hover {
      color: var(--bulma-link-hover);
      border-bottom-color: var(--bulma-link-hover);
    }
  }
  
  .footer-copyright {
    font-size: 0.85rem;
    margin-bottom: 0.35rem; 
  }

  .built-with-love { 
    font-size: 0.8rem; /* 调整字体大小 */
    font-style: italic;
    opacity: 0.8; /* 略微降低透明度 */
  }
}

/* 红心跳动动画 */
@keyframes heartBeat {
  0%, 100% {
    transform: scale(1);
    opacity: 0.9;
  }
  10%, 30% {
    transform: scale(0.85);
    opacity: 0.7;
  }
  20%, 40%, 60%, 80% {
    transform: scale(1.15);
    opacity: 1;
  }
  50%, 70% {
    transform: scale(1.08);
    opacity: 0.95;
  }
}
</style>

