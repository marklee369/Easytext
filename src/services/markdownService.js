import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  breaks: true, // 将换行符渲染为 <br>
  pedantic: false,
  sanitize: false, // 重要：我们使用 DOMPurify 进行净化
  smartLists: true,
  smartypants: false,
});

export const markdownService = {
  render: (markdownText) => {
    if (typeof markdownText !== 'string') return '';
    const rawHtml = marked.parse(markdownText);
    return DOMPurify.sanitize(rawHtml, {
        USE_PROFILES: { html: true }, // 允许基本的HTML标签
        ADD_ATTR: ['target'], // 如果你希望允许target="_blank"等
    });
  }
};

