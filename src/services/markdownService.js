import { marked } from 'marked';
import DOMPurify from 'dompurify';

class SanitizedMarkdownService {
  constructor() {
    // 您可以在这里配置 Marked.js 的选项
    marked.setOptions({
      breaks: true, // 将 \n 转换为 <br>
      gfm: true,    // 启用 GitHub Flavored Markdown
      pedantic: false,
    });
  }

  /**
   * 将 Markdown 字符串安全地转换为净化后的 HTML
   * @param {string} markdownText - 需要转换的 Markdown 文本
   * @returns {string} - 安全的 HTML 字符串
   */
  render(markdownText) {
    if (typeof markdownText !== 'string' || markdownText.trim() === '') {
      return '';
    }
    // 1. 将 Markdown 转换为 HTML
    const dirtyHtml = marked.parse(markdownText);
    
    // 2. 使用 DOMPurify 清理 HTML，防止 XSS 攻击
    const cleanHtml = DOMPurify.sanitize(dirtyHtml);

    return cleanHtml;
  }
}

export const sanitizedMarkdownService = new SanitizedMarkdownService();
