<template>
  <section class="section hero is-fullheight-with-navbar">
    <div class="hero-body">
      <div class="container has-text-centered">
        <h1 class="title is-1 has-text-primary">404</h1>
        <p class="subtitle is-3 has-text-weight-medium">哎呀！页面飞走了</p>
        <p class="mb-5 is-size-5 has-text-grey">
          您要寻找的页面可能已被删除、名称已更改或暂时不可用。
        </p>
        <router-link to="/" class="button is-primary is-large">
          <span class="icon"><font-awesome-icon :icon="['fas', 'share-nodes']" /></span>
          <span>返回创建密文</span>
        </router-link>
      </div>
    </div>
  </section>
</template>

<script setup>
// No script needed for this simple static page
</script>

<style scoped lang="scss">
.hero {
  // background-color: var(--bulma-background); // Ensure hero adapts to theme
}
// Add specific styles if needed
</style>

