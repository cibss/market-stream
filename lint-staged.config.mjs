const config = {
  "*.{js,jsx,ts,tsx,mjs,cjs}": ["eslint --fix", "prettier --write"],

  "*.{json,css,scss,md,mdx,yml,yaml}": ["prettier --write"],
};

export default config;
