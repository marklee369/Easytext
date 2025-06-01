// frontend/src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// 样式导入
import 'bulma/css/bulma.css';     // 先导入 Bulma
import './styles/main.scss';      // 再导入你的自定义样式

// Font Awesome 图标库设置
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
// Solid Icons (fas)
import { 
    faSun, faMoon, faCopy, faTrash, faEye, faEyeSlash, 
    faLock, faKey, faShareNodes, faExclamationTriangle, faHourglassHalf,
    faMicrochip, faNetworkWired, faFingerprint, faShieldHalved, faBolt, faAtom,
    faLockOpen, faCheckCircle, faSpinner, faCircleNotch,
    faQuestionCircle,faComments,
    faHeart,faTerminal // <--- 新增红心图标
} from '@fortawesome/free-solid-svg-icons';
// Brand Icons (fab) 
import { faGithub } from '@fortawesome/free-brands-svg-icons';

// 添加所有需要的图标到库中
library.add(
    // Solid Icons
    faSun, faMoon, faCopy, faTrash, faEye, faEyeSlash, 
    faLock, faKey, faShareNodes, faExclamationTriangle, faHourglassHalf,
    faMicrochip, faNetworkWired, faFingerprint, faShieldHalved, faBolt, faAtom,
    faLockOpen, faCheckCircle, faSpinner, faCircleNotch,
    faQuestionCircle, 
    faHeart,faTerminal, // <--- 添加红心
    // Brand Icons
    faGithub,faComments
);

const app = createApp(App);

app.use(router);
app.component('font-awesome-icon', FontAwesomeIcon); // 全局注册 FontAwesomeIcon 组件

app.mount('#app');

// --- 应用挂载后处理 ---
const loader = document.getElementById('app-loader');
if (loader) {
  router.isReady().then(() => {
    loader.classList.add('loaded');
    loader.addEventListener('transitionend', () => {
      if (loader.parentElement) { 
          loader.remove();
      }
    }, { once: true }); 
  });
}

router.isReady().then(() => {
    document.body.classList.add('app-mounted');
});

