const { match } = require('path-to-regexp');
const m = match('/public/uploads/*objectName');
console.log(m('/public/uploads/seed-product-123.jpg'));
