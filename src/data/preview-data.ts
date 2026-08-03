/** 打印预览时使用的写死测试数据，覆盖所有预设字段 */
export const PREVIEW_DATA: Record<string, unknown> = {
  // ── 表单字段 ──
  orderNo: 'PO-2024-0731',
  date: '2024-07-31',
  customerName: '深圳日东科技有限公司',
  amount: '¥128,600.00',
  signer: '张三',
  supplier: '广州恒达电子有限公司',
  shipper: '顺丰速运',
  address: '广东省深圳市南山区科技园南路 88 号',
  remark: '1. 随货附质检报告及合格证。\n2. 收货时请核对装箱单与实物数量，如有差异请在 48 小时内联系。\n3. 本订单不含安装调试费用，如需现场服务请提前预约。\n4. 质保期自发货之日起 12 个月，易损件不在质保范围内。',
  validity: '2024-08-15',
  contact: '李经理',
  phone: '13800138000',

  // ── 条码 / 二维码 ──
  barcode: 'PO20240731001',
  qrcode: 'https://example.com/track/PO20240731001',

  // ── 表格数据 ──
  table: [
    { id: 1, NAME: '精密轴承组件 A-200', SL: 50, GG: 'Φ20×47×14mm', DJ: 185.0, JE: 9250.0, UNIT: '个', BRAND: 'SKF', MODEL: 'A-200', LOCATION: 'A-01-02' },
    { id: 2, NAME: '不锈钢法兰 DN50', SL: 200, GG: '304/PN16', DJ: 86.0, JE: 17200.0, UNIT: '个', BRAND: '日标', MODEL: 'DN50-PN16', LOCATION: 'B-03-05' },
    { id: 3, NAME: '液压油缸密封圈', SL: 30, GG: '80×65×9mm', DJ: 420.0, JE: 12600.0, UNIT: '套', BRAND: 'NOK', MODEL: 'USH-80', LOCATION: 'C-02-01' },
    { id: 4, NAME: '高强度螺栓 M16×80', SL: 500, GG: 'M16×80/8.8级', DJ: 3.5, JE: 1750.0, UNIT: '支', BRAND: '晋亿', MODEL: 'GB5783-M16×80', LOCATION: 'A-04-03' },
    { id: 5, NAME: '铜芯电缆 RVV 3×2.5', SL: 300, GG: 'RVV 3×2.5mm²', DJ: 12.8, JE: 3840.0, UNIT: '米', BRAND: '远东', MODEL: 'RVV-3×2.5', LOCATION: 'D-01-06' },
    { id: 6, NAME: '伺服电机驱动器', SL: 8, GG: '1.5kW/220V', DJ: 2680.0, JE: 21440.0, UNIT: '台', BRAND: '汇川', MODEL: 'IS620N-15', LOCATION: 'E-02-01' },
    { id: 7, NAME: '直线导轨滑块', SL: 40, GG: 'HGH20CA', DJ: 95.0, JE: 3800.0, UNIT: '个', BRAND: '上银', MODEL: 'HGH20CA', LOCATION: 'A-02-08' },
    { id: 8, NAME: '气动电磁阀', SL: 60, GG: '4V210-08', DJ: 48.5, JE: 2910.0, UNIT: '个', BRAND: '亚德客', MODEL: '4V210-08', LOCATION: 'C-01-04' },
    { id: 9, NAME: '接近开关', SL: 120, GG: 'M12/PNP', DJ: 36.0, JE: 4320.0, UNIT: '个', BRAND: '欧姆龙', MODEL: 'E2E-X5ME1', LOCATION: 'E-03-02' },
    { id: 10, NAME: '铝合金型材 4040', SL: 80, GG: '4040/6m', DJ: 58.0, JE: 4640.0, UNIT: '根', BRAND: '国标', MODEL: '4040-6M', LOCATION: 'F-01-01' },
    { id: 11, NAME: '同步带轮', SL: 25, GG: 'HTD5M-30', DJ: 72.0, JE: 1800.0, UNIT: '个', BRAND: '盖茨', MODEL: 'HTD5M-30Z', LOCATION: 'A-05-03' },
    { id: 12, NAME: 'PLC 扩展模块', SL: 6, GG: '16点输入', DJ: 980.0, JE: 5880.0, UNIT: '块', BRAND: '西门子', MODEL: 'SM1221', LOCATION: 'E-01-05' },
    { id: 13, NAME: '散热风扇', SL: 45, GG: '120×120×38', DJ: 28.0, JE: 1260.0, UNIT: '个', BRAND: 'SUNON', MODEL: 'PMD1204PQB', LOCATION: 'D-02-07' },
    { id: 14, NAME: '工业以太网线', SL: 100, GG: 'Cat6/屏蔽', DJ: 6.5, JE: 650.0, UNIT: '米', BRAND: '罗森伯格', MODEL: 'IE-Cat6', LOCATION: 'D-03-01' },
    { id: 15, NAME: '真空吸盘', SL: 90, GG: 'Φ40/硅胶', DJ: 22.0, JE: 1980.0, UNIT: '个', BRAND: 'SMC', MODEL: 'ZP40US', LOCATION: 'C-04-02' },
    { id: 16, NAME: '步进电机', SL: 16, GG: '57/2.0N·m', DJ: 186.0, JE: 2976.0, UNIT: '台', BRAND: '雷赛', MODEL: '57HS22', LOCATION: 'E-02-06' },
    { id: 17, NAME: '触摸屏 HMI', SL: 4, GG: '7寸/以太网', DJ: 1250.0, JE: 5000.0, UNIT: '台', BRAND: '威纶通', MODEL: 'MT8071iE', LOCATION: 'E-01-02' },
    { id: 18, NAME: '光电传感器', SL: 70, GG: '对射式', DJ: 55.0, JE: 3850.0, UNIT: '对', BRAND: '基恩士', MODEL: 'PZ-G51N', LOCATION: 'E-03-08' },
    { id: 19, NAME: '拖链电缆', SL: 150, GG: '4×1.5mm²', DJ: 9.8, JE: 1470.0, UNIT: '米', BRAND: '易格斯', MODEL: 'CF130-04', LOCATION: 'D-01-09' },
    { id: 20, NAME: '精密联轴器', SL: 35, GG: 'Φ14/铝合金', DJ: 68.0, JE: 2380.0, UNIT: '个', BRAND: 'R+W', MODEL: 'BK2-14', LOCATION: 'A-03-06' },
  ],
}