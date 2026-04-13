# maks.top

Personal Linux & DevOps knowledge base and blog.  
Stack: **Hugo** · **GitHub Pages** · **Pagefind** · **Cloudflare DNS**

**Live site:** https://maks.top  
**Working branch:** `hugo`

---

## Quick start

```bash
git clone --recurse-submodules https://github.com/NickelFace/maks.top.git
cd maks.top
git checkout hugo

# Full cycle (build + search index + serve)
./dev.sh

# Fast iteration (no search)
hugo server -D
```

---

## Documentation

| | |
|---|---|
| [Project Overview](https://maks.top/docs/overview/) | Architecture, Hugo pipeline, deployment flow |
| [New Page Guide](https://maks.top/docs/new-page/) | How to add prose, interactive or cert pages |
| [Deploy & Local Dev](https://maks.top/docs/deploy/) | CI/CD pipeline, pitfalls, DNS setup |
| [CSS Reference](https://maks.top/docs/css/) | Variables, load order, class reference |
| [JavaScript](https://maks.top/docs/javascript/) | All JS functions and where they live |
| [Templates](https://maks.top/docs/templates/) | Hugo layout routing and block structure |
| [Frontmatter](https://maks.top/docs/frontmatter/) | All frontmatter fields by content type |
| [Breadcrumbs](https://maks.top/docs/breadcrumbs/) | Per-template breadcrumb implementation |
| [Tags & Search](https://maks.top/docs/tags-and-search/) | Tag filter + Pagefind architecture |
