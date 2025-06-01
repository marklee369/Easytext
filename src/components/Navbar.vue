<template>
  <nav class="navbar is-fixed-top has-shadow main-navbar" role="navigation" aria-label="main navigation">
    <div class="container">
      <div class="navbar-brand">
        <router-link class="navbar-item" to="/">
          <span class="icon-text">
            <span class="icon is-medium brand-icon">
              <font-awesome-icon :icon="['fas', 'bolt']" size="lg"/> 
            </span>
            <span class="brand-title ml-2">Encrypt <span class="brand-pro">Pro</span></span>
          </span>
        </router-link>

        <a role="button" 
           class="navbar-burger" 
           :class="{'is-active': isActive}" 
           @click="isActive = !isActive" 
           aria-label="menu" 
           aria-expanded="false"
        >
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </a>
      </div>

      <div id="navbarMenu" class="navbar-menu" :class="{'is-active': isActive}">
        <div class="navbar-start">
          </div>
        <div class="navbar-end">
          <a class="navbar-item nav-link-custom" target="_blank" href="https://chat.arksec.net">
            <span class="icon-text">
              <span class="icon"><font-awesome-icon :icon="['fas', 'comments']" /></span>
              <span>匿名聊天</span>
            </span>
	    </a>
	 <a class="navbar-item nav-link-custom" target="_blank" href="https://ssh.arksec.net">
            <span class="icon-text">
              <span class="icon"><font-awesome-icon :icon="['fas', 'terminal']" /></span> <span>在线ssh</span>
            </span>
		  </a>
          <a class="navbar-item nav-link-custom" href="https://github.com/macklee6/Easytext" target="_blank" rel="noopener noreferrer">
             <span class="icon-text">
              <span class="icon"><font-awesome-icon :icon="['fab', 'github']" /></span> <span>源码</span>
            </span>
          </a>
          </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue';
// Font Awesome 图标可能需要单独导入品牌图标
// import { faGithub } from '@fortawesome/free-brands-svg-icons'; // 如果使用 'fab'
// import { library } from '@fortawesome/fontawesome-svg-core';
// library.add(faGithub); // 在 main.js 中统一添加更好

const isActive = ref(false); // 用于移动设备上的汉堡菜单
</script>

<style scoped lang="scss">
.main-navbar {
  border-bottom: 1px solid var(--navbar-border-color, var(--bulma-border));
}

.navbar-item img { 
  max-height: 2.5rem;
}

.navbar-brand > .navbar-item {
  padding-left: 0.75rem; 
  padding-right: 0.75rem;
  transition: transform 0.2s ease-out, opacity 0.2s ease-out;
  &:hover {
    transform: scale(1.03); 
    opacity: 0.9;
  }
}

.brand-icon .svg-inline--fa {
  color: var(--primary-color); 
  transition: color 0.2s ease-out;
}

.brand-title {
  font-family: var(--tech-font-family-mono, 'IBM Plex Mono', monospace); 
  font-weight: 600;
  font-size: 1.3rem; 
  letter-spacing: 0.5px;
  color: var(--bulma-text-strong); 
}

.brand-pro {
  font-size: 0.65em; 
  color: var(--primary-color); 
  vertical-align: text-top; 
  margin-left: 3px;
  font-weight: bold;
  opacity: 0.8;
}

/* 新增链接的样式 */
.nav-link-custom {
  font-family: var(--tech-font-family-sans, 'Inter', sans-serif);
  font-weight: 500;
  color: var(--bulma-text-light); // 使用次要文字颜色
  padding: 0.5rem 1rem; // 调整内边距
  border-radius: var(--bulma-radius-small); // 轻微圆角
  margin: 0 0.25rem; // 链接间距
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.15s ease;
  position: relative; // 为下划线动画做准备

  .icon { // 图标颜色也应随主题变化
    color: var(--bulma-text-light);
    transition: color 0.2s ease;
  }

  &:hover,
  &.router-link-exact-active { // 当前激活路由的样式
    background-color: var(--tech-panel-bg, color-mix(in srgb, var(--primary-color) 15%, transparent)); // 使用面板背景色或主色调的浅色
    color: var(--primary-color); // 高亮颜色
    transform: translateY(-1px); // 轻微上浮

    .icon { // Hover 或激活时图标颜色
      color: var(--primary-color);
    }
  }
  
  // 可选：添加一个微妙的底部边框动画
  // &::after {
  //   content: '';
  //   position: absolute;
  //   left: 0.75rem; // 与 padding 对应
  //   right: 0.75rem;
  //   bottom: 0.25rem; // 距离底部一点
  //   height: 2px;
  //   background-color: var(--primary-color);
  //   transform: scaleX(0);
  //   transform-origin: center;
  //   transition: transform 0.3s cubic-bezier(0.19, 1, 0.22, 1);
  // }
  // &:hover::after,
  // &.router-link-exact-active::after {
  //   transform: scaleX(1);
  // }
}


.navbar-burger {
  color: var(--bulma-text); 
  span {
    background-color: var(--bulma-text); 
  }
  &:hover {
    background-color: var(--tech-panel-bg); 
  }
  &.is-active span {
    background-color: var(--primary-color); 
  }
}

@media screen and (max-width: 1023px) {
  .navbar-menu.is-active {
    background-color: var(--bulma-navbar-background-color); 
    border-top: 1px solid var(--navbar-border-color);
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  }
  .nav-link-custom { // 移动端菜单项样式调整
    padding: 0.75rem 1rem; 
    margin: 0;
    border-radius: 0;
    display: flex; // 确保图标和文字对齐
    align-items: center;
    &:hover,
    &.router-link-exact-active {
        background-color: var(--tech-panel-bg);
    }
    .icon-text {
        width: 100%; // 让 icon-text 充满 navbar-item
    }
  }
}
</style>

