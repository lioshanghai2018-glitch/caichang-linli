// 商品工具函数
const PRODUCTS_KEY = 'products'

// 所有商品数据（模拟）
const allProducts = [
  {
    id: '1',
    name: '有机西红柿',
    desc: '自然成熟·酸甜可口',
    spec: '约500g/份',
    image: '/static/images/有机西红柿.png',
    originalPrice: '¥12.80',
    currentPrice: '¥8.80',
    service: '当日下单·次日取货',
    stock: 100
  },
  {
    id: '2',
    name: '新鲜鸡蛋',
    desc: '农家散养·营养健康',
    spec: '10枚/盒',
    image: '/static/images/新鲜鸡蛋.png',
    originalPrice: '¥15.00',
    currentPrice: '¥9.90',
    service: '当日下单·次日取货',
    stock: 50
  },
  {
    id: '3',
    name: '有机青菜',
    desc: '新鲜直采·产地直发',
    spec: '约300g/份',
    image: '/static/images/有机青菜.png',
    originalPrice: '¥6.00',
    currentPrice: '¥3.80',
    service: '当日下单·次日取货',
    stock: 200
  },
  {
    id: '4',
    name: '胡萝卜',
    desc: '新鲜胡萝卜',
    spec: '约400g/份',
    image: '/static/images/胡萝卜.png',
    originalPrice: '¥5.00',
    currentPrice: '¥2.90',
    service: '当日下单·次日取货',
    stock: 150
  },
  {
    id: '5',
    name: '小青菜',
    desc: '新鲜直采',
    spec: '约300g/份',
    image: '/static/images/胡萝卜.png',
    originalPrice: '¥9.00',
    currentPrice: '¥6.50',
    service: '当日下单·次日取货',
    stock: 80
  }
]

export function getProductById(id) {
  return allProducts.find(p => p.id === id) || allProducts[0]
}

export function getAllProducts() {
  return allProducts
}

export function getProductsByCategory(category) {
  // 简化：返回所有商品
  return allProducts
}

export function searchProducts(keyword) {
  if (!keyword) return allProducts
  return allProducts.filter(p =>
    p.name.includes(keyword) || p.desc.includes(keyword)
  )
}