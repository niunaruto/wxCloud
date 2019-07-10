const cloud = require('wx-server-sdk')
const {
  WXPay,
  WXPayConstants,
  WXPayUtil
} = require('wx-js-utils')
const ip = require('ip')
const {
  MCHID,
  KEY,
  CERT_FILE_CONTENT,
  TIMEOUT
} = require('./config/index')

cloud.init()

// 云函数入口
exports.main = async function (event) {
  const {
    OPENID,
  } = cloud.getWXContext()
  let APPID = 'wx9a8a8b8bf9c085c0'
  const pay = new WXPay({
    appId: APPID,
    mchId: MCHID,
    key: KEY,
    certFileContent: CERT_FILE_CONTENT,
    timeout: TIMEOUT,
    signType: WXPayConstants.SIGN_TYPE_MD5,
    useSandbox: false // 不使用沙箱环境
  })

  const {data } = event


  const goodId = data.id
  let goods = null
  let good = null

  // 拼凑订单参数
  const curTime = Date.now()
  const tradeNo = `${'goodId'}-${curTime}`
  const body = 'good.name'
  const spbill_create_ip = ip.address() || '127.0.0.1'
  const notify_url = 'http://wxpay.wxutil.com/pub_v2/pay/notify.v2.php' // '云函数暂时没有外网地址和HTTP触发起，暂时随便填个地址。'
  const total_fee = data.total_fee * 100
  const time_stamp = '' + Math.ceil(Date.now() / 1000)
  const out_trade_no = `${tradeNo}`
  const sign_type = WXPayConstants.SIGN_TYPE_MD5

  const orderParam = {
    body,
    spbill_create_ip,
    notify_url,
    out_trade_no,
    total_fee,
    openid: OPENID,
    trade_type: 'JSAPI',
    timeStamp: time_stamp,
  }

  // 在微信支付服务端生成该订单
  const {
    return_code,
    ...restData
  } = await pay.unifiedOrder(orderParam)

  let order_id = null
  let model = null
  if (return_code === 'SUCCESS' && restData.result_code === 'SUCCESS') {
    const {
      prepay_id,
      nonce_str
    } = restData

    // 生成微信支付签名，为后在小程序端进行支付打下基础
    const sign = WXPayUtil.generateSignature({
      appId: APPID,
      nonceStr: nonce_str,
      package: `prepay_id=${prepay_id}`,
      signType: 'MD5',
      timeStamp: time_stamp
    }, KEY)

    const orderData = {
      out_trade_no,
      time_stamp,
      nonce_str,
      sign,
      sign_type,
      body,
      total_fee,
      prepay_id,
      sign,
      status: 0, // 0表示刚创建订单
      _openid: OPENID,
    }
    model = orderData
  }

  return {
    code: return_code === 'SUCCESS' ? 0 : 1,
    data: {
      model
    }
  }
}
