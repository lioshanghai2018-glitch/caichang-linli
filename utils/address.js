// 地址管理工具
const ADDRESS_KEY = 'user_addresses'

export function getAddressList() {
  try {
    const data = uni.getStorageSync(ADDRESS_KEY)
    return data ? JSON.parse(data) : []
  } catch (e) {
    return []
  }
}

export function saveAddress(address) {
  const list = getAddressList()
  if (address.id) {
    // 编辑更新
    const index = list.findIndex(a => a.id === address.id)
    if (index > -1) {
      list[index] = address
    }
  } else {
    // 新增
    address.id = Date.now().toString()
    list.push(address)
  }
  // 如果设为默认，取消其他默认
  if (address.isDefault) {
    list.forEach(a => a.isDefault = false)
    address.isDefault = true
  }
  uni.setStorageSync(ADDRESS_KEY, JSON.stringify(list))
  return address
}

export function getDefaultAddress() {
  const list = getAddressList()
  return list.find(a => a.isDefault) || list[0] || null
}

export function deleteAddress(id) {
  const list = getAddressList()
  const filtered = list.filter(a => a.id !== id)
  uni.setStorageSync(ADDRESS_KEY, JSON.stringify(filtered))
}

export function setDefaultAddress(id) {
  const list = getAddressList()
  list.forEach(a => a.isDefault = a.id === id)
  uni.setStorageSync(ADDRESS_KEY, JSON.stringify(list))
}