import { createRouter, createWebHistory } from 'vue-router';
import CreateSecretView from '../views/CreateSecretView.vue';
import ViewSecretView from '../views/ViewSecretView.vue';
import NotFoundView from '../views/NotFoundView.vue';

const routes = [
  {
    path: '/',
    name: 'CreateSecret',
    component: CreateSecretView,
    meta: { title: 'Easy text' }
  },
  {
    path: '/s/:secretId',
    name: 'ViewSecret',
    component: ViewSecretView,
    props: true, // 将 :secretId 作为 prop 传递给组件
    meta: { title: 'Easy text' }
  },
  {
    path: '/:pathMatch(.*)*', // 捕获所有未匹配的路由
    name: 'NotFound',
    component: NotFoundView,
    meta: { title: '页面未找到' }
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 总是在导航后滚动到顶部
    return { top: 0 }
  }
});

// 全局后置守卫，用于更新页面标题
router.afterEach((to) => {
  document.title = to.meta.title || 'Code Share';
});


export default router;

