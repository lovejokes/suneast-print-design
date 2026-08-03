(function () {
  window.HIPRINT_CONFIG = {
    //optionItems: [hiprintCustomOptionItem],//自定义选项
    movingDistance: 1.5, //鼠标拖动一次移动的距离,默认1.5pt
    paperHeightTrim: 1, //纸张html 的高度等于真实高度-1
    showPosition: true, //显示坐标位置
    positionLineMode: false, //坐标显示在线上的
    positionUnit: true, //显示坐标单位
    showSizeBox: true, //显示宽高box
    adsorbMin: 3, //吸附最小距离pt
    showAdsorbLine: true, //显示吸附线
    adsorbLineMin: 6, //吸附线显示最小距离pt
    paperNumberContinue: true, // 固定连续编号；面板配置项已移除，勿再暴露 UI
    panel: {
      supportOptions: [
        {
          name: 'leftOffset',
          hidden: false
        },
        {
          name: 'topOffset',
          hidden: false
        },
        {
          name: 'rightOffset',
          hidden: false
        },
        {
          name: 'bottomOffset',
          hidden: false
        },
        {
          name: 'fontFamily',
          hidden: false
        },
        {
          name: 'orient',
          hidden: false
        },
        {
          name: 'paperNumberDisabled',
          hidden: false
        },
        {
          name: 'paperNumberFormat',
          hidden: false
        },
        {
          name: 'watermarkOptions',
          hidden: false
        }],
      default: {
        leftOffset: 20,
        topOffset: 20,
        rightOffset: 20,
        bottomOffset: 20,
      }
    },
    text: {
      tabs: [
        {
          name: '基础', options: [
            {
              name: 'title',
              hidden: false
            },
            {
              name: 'field',
              hidden: false
            },
            {
              name: 'testData',
              hidden: false
            },
            {
              name: 'coordinate',
              hidden: false
            },
            {
              name: 'widthHeight',
              hidden: false
            },
            {
              name: 'hideTitle',
              hidden: false
            },
            {
              name: 'fixed',
              hidden: false
            }]
        },
        {
          name: '样式', options: [
            {
              name: 'dataType',
              hidden: false
            },
            {
              name: 'fontFamily',
              hidden: false
            },
            {
              name: 'fontSize',
              hidden: false
            },
            {
              name: 'fontWeight',
              hidden: false
            },
            {
              name: 'letterSpacing',
              hidden: false
            },
            {
              name: 'color',
              hidden: false
            },
            {
              name: 'backgroundColor',
              hidden: false
            },
            {
              name: 'textDecoration',
              hidden: false
            },
            {
              name: 'textAlign',
              hidden: false
            },
            {
              name: 'textContentVerticalAlign',
              hidden: false
            },
            {
              name: 'textContentWrap',
              hidden: false
            },
            {
              name: 'lineHeight',
              hidden: false
            },
            {
              name: 'transform',
              hidden: false
            },
            {
              name: 'zIndex',
              hidden: false
            }
          ]
        },
        {
          name: '边框', options: [
            {
              name: 'optionsGroup',
              hidden: false
            },
            {
              name: 'borderLeft',
              hidden: false
            },
            {
              name: 'borderTop',
              hidden: false
            },
            {
              name: 'borderRight',
              hidden: false
            },
            {
              name: 'borderBottom',
              hidden: false
            },
            {
              name: 'borderWidth',
              hidden: false
            },
            {
              name: 'borderColor',
              hidden: false
            },
            {
              name: 'contentPaddingLeft',
              hidden: false
            },
            {
              name: 'contentPaddingTop',
              hidden: false
            },
            {
              name: 'contentPaddingRight',
              hidden: false
            },
            {
              name: 'contentPaddingBottom',
              hidden: false
            }]
        }],
      supportOptions: [
        {
          name: 'title',
          hidden: false
        },
        {
          name: 'field',
          hidden: false
        },
        {
          name: 'testData',
          hidden: false
        },
        {
          name: 'coordinate',
          hidden: false
        },
        {
          name: 'widthHeight',
          hidden: false
        },
        {
          name: 'dataType',
          hidden: false
        },
        {
          name: 'fontFamily',
          hidden: false
        },
        {
          name: 'fontSize',
          hidden: false
        },
        {
          name: 'fontWeight',
          hidden: false
        },
        {
          name: 'letterSpacing',
          hidden: false
        },
        {
          name: 'color',
          hidden: false
        },
        {
          name: 'textDecoration',
          hidden: false
        },
        {
          name: 'textAlign',
          hidden: false
        },
        {
          name: 'textContentVerticalAlign',
          hidden: false
        },
        {
          name: 'textContentWrap',
          hidden: false
        },
        {
          name: 'lineHeight',
          hidden: false
        },
        {
          name: 'textType',
          hidden: false
        },
        {
          name: 'barcodeMode',
          hidden: false
        },
        {
          name: 'barTextMode',
          hidden: false
        },
        {
          name: 'barWidth',
          hidden: false
        },
        {
          name: 'barAutoWidth',
          hidden: false
        },
        {
          name: "qrCodeLevel",
          hidden: false
        },
        {
          name: 'hideTitle',
          hidden: false
        },
        {
          name: 'pageBreak',
          hidden: false
        },
        {
          name: 'showInPage',
          hidden: false
        },
        {
          name: 'unShowInPage',
          hidden: false
        },
        {
          name: 'fixed',
          hidden: false
        },
        {
          name: 'axis',
          hidden: false
        },
        {
          name: 'transform',
          hidden: false
        },
        {
          name: 'zIndex',
          hidden: false
        },
        {
          name: 'optionsGroup',
          hidden: false
        },
        {
          name: 'borderLeft',
          hidden: false
        },
        {
          name: 'borderTop',
          hidden: false
        },
        {
          name: 'borderRight',
          hidden: false
        },
        {
          name: 'borderBottom',
          hidden: false
        },
        {
          name: 'borderWidth',
          hidden: false
        },
        {
          name: 'borderColor',
          hidden: false
        },
        {
          name: 'contentPaddingLeft',
          hidden: false
        },
        {
          name: 'contentPaddingTop',
          hidden: false
        },
        {
          name: 'contentPaddingRight',
          hidden: false
        },
        {
          name: 'contentPaddingBottom',
          hidden: false
        },
        {
          name: 'backgroundColor',
          hidden: false
        },
        {
          name: 'formatter',
          hidden: true
        },
        {
          name: 'styler',
          hidden: true
        }
      ],
      default: {
        width: 120,
        height: 20,
        backgroundColor: '',
        borderColor: '',
        // barAutoWidth: 'true' 这里必须使用字符串
      }
    },
    image: {
      tabs: [
        {
          name: '基础', options: [
            {
              name: 'field',
              hidden: false
            },
            {
              name: 'src',
              hidden: false
            },
            {
              name: 'fit',
              hidden: false
            },
            {
              name: 'coordinate',
              hidden: false
            },
            {
              name: 'widthHeight',
              hidden: false
            },
            {
              name: 'showInPage',
              hidden: false
            },
            {
              name: 'unShowInPage',
              hidden: false
            },
            {
              name: 'fixed',
              hidden: false
            },
            {
              name: 'floatOverlay',
              hidden: false
            }]
        },
        {
          name: '样式', options: [
            {
              name: 'transform',
              hidden: false
            },
            {
              name: 'zIndex',
              hidden: false
            },
            {
              name: 'borderRadius',
              hidden: false
            }]
        }],
      supportOptions: [
        {
          name: 'field',
          hidden: false
        },
        {
          name: 'src',
          hidden: false
        },
        {
          name: 'fit',
          hidden: false
        },
        {
          name: 'borderRadius',
          hidden: false
        },
        {
          name: 'coordinate',
          hidden: false
        },
        {
          name: 'widthHeight',
          hidden: false
        },
        {
          name: 'showInPage',
          hidden: false
        },
        {
          name: 'unShowInPage',
          hidden: false
        },
        {
          name: 'fixed',
          hidden: false
        },
        {
          name: 'floatOverlay',
          hidden: false
        },
        {
          name: 'pageBreak',
          hidden: false
        },
        {
          name: 'axis',
          hidden: false
        },
        {
          name: 'transform',
          hidden: false
        },
        {
          name: 'zIndex',
          hidden: false
        },
        {
          name: 'formatter',
          hidden: true
        },
        {
          name: 'styler',
          hidden: true
        }
      ],
      default: { borderColor: '', }
    },
    longText: {
      tabs: [
        {
          name: '基础', options: [
            {
              name: 'title',
              hidden: false
            },
            {
              name: 'field',
              hidden: false
            },
            {
              name: 'testData',
              hidden: false
            },
            {
              name: 'coordinate',
              hidden: false
            },
            {
              name: 'widthHeight',
              hidden: false
            },
            {
              name: 'hideTitle',
              hidden: false
            },
            {
              name: 'fixed',
              hidden: false
            }]
        },
        {
          name: '样式', options: [
            {
              name: 'fontFamily',
              hidden: false
            },
            {
              name: 'fontSize',
              hidden: false
            },
            {
              name: 'fontWeight',
              hidden: false
            },
            {
              name: 'letterSpacing',
              hidden: false
            },
            {
              name: 'textAlign',
              hidden: false
            },
            {
              name: 'lineHeight',
              hidden: false
            },
            {
              name: 'color',
              hidden: false
            },
            {
              name: 'longTextIndent',
              hidden: false
            },
            {
              name: 'leftSpaceRemoved',
              hidden: false
            },
            {
              name: 'lHeight',
              hidden: false
            },
            {
              name: 'transform',
              hidden: false
            },
            {
              name: 'zIndex',
              hidden: false
            }]
        },
        {
          name: '边框', options: [
            {
              name: 'optionsGroup',
              hidden: false
            },
            {
              name: 'borderLeft',
              hidden: false
            },
            {
              name: 'borderTop',
              hidden: false
            },
            {
              name: 'borderRight',
              hidden: false
            },
            {
              name: 'borderBottom',
              hidden: false
            },
            {
              name: 'borderWidth',
              hidden: false
            },
            {
              name: 'borderColor',
              hidden: false
            },
            {
              name: 'contentPaddingLeft',
              hidden: false
            },
            {
              name: 'contentPaddingTop',
              hidden: false
            },
            {
              name: 'contentPaddingRight',
              hidden: false
            },
            {
              name: 'contentPaddingBottom',
              hidden: false
            }]
        }],
      supportOptions: [
        {
          name: 'title',
          hidden: false
        },
        {
          name: 'field',
          hidden: false
        },
        {
          name: 'testData',
          hidden: false
        },
        {
          name: 'coordinate',
          hidden: false
        },
        {
          name: 'widthHeight',
          hidden: false
        },
        {
          name: 'fontFamily',
          hidden: false
        },
        {
          name: 'fontSize',
          hidden: false
        },
        {
          name: 'fontWeight',
          hidden: false
        },
        {
          name: 'letterSpacing',
          hidden: false
        },
        {
          name: 'textAlign',
          hidden: false
        },
        {
          name: 'lineHeight',
          hidden: false
        },
        {
          name: 'color',
          hidden: false
        },
        {
          name: 'hideTitle',
          hidden: false
        },
        {
          name: 'longTextIndent',
          hidden: false
        },
        {
          name: 'leftSpaceRemoved',
          hidden: false
        },
        {
          name: 'pageBreak',
          hidden: false
        },
        {
          name: 'showInPage',
          hidden: false
        },
        {
          name: 'unShowInPage',
          hidden: false
        },
        {
          name: 'fixed',
          hidden: false
        },
        {
          name: 'axis',
          hidden: false
        },
        {
          name: 'lHeight',
          hidden: false
        },
        {
          name: 'transform',
          hidden: false
        },
        {
          name: 'zIndex',
          hidden: false
        },
        {
          name: 'optionsGroup',
          hidden: false
        },
        {
          name: 'borderLeft',
          hidden: false
        },
        {
          name: 'borderTop',
          hidden: false
        },
        {
          name: 'borderRight',
          hidden: false
        },
        {
          name: 'borderBottom',
          hidden: false
        },
        {
          name: 'borderWidth',
          hidden: false
        },
        {
          name: 'borderColor',
          hidden: false
        },
        {
          name: 'contentPaddingLeft',
          hidden: false
        },
        {
          name: 'contentPaddingTop',
          hidden: false
        },
        {
          name: 'contentPaddingRight',
          hidden: false
        },
        {
          name: 'contentPaddingBottom',
          hidden: false
        },
        {
          name: 'backgroundColor',
          hidden: false
        },
        {
          name: 'formatter',
          hidden: true
        },
        {
          name: 'styler',
          hidden: true
        }
      ],
      default: {
        // 默认贴一行左右内容高度；需要占位用样式里的「最低高度」
        height: 18,
        width: 300,
        backgroundColor: '',
        borderColor: '',
      }
    },
    table: {
      tabs: [
        {
          name: '基础', options: [
            {
              name: 'field',
              hidden: false
            },
            {
              name: 'testData',
              hidden: false
            },
            {
              name: 'coordinate',
              hidden: false
            },
            {
              name: 'widthHeight',
              hidden: false
            },
            {
              name: 'tableHeaderRepeat',
              hidden: false
            },
            {
              name: 'tableFooterRepeat',
              hidden: false
            },
            {
              name: 'autoCompletion',
              hidden: false
            },
            {
              name: 'maxRows',
              hidden: false
            },
            {
              name: 'columns',
              hidden: false
            }]
        },
        {
          name: '样式', options: [
            {
              name: 'fontFamily',
              hidden: false
            },
            {
              name: 'fontSize',
              hidden: false
            },
            {
              name: 'lineHeight',
              hidden: false
            },
            {
              name: 'textAlign',
              hidden: false
            },
            {
              name: 'gridColumns',
              hidden: false
            },
            {
              name: 'gridColumnsGutter',
              hidden: false
            },
            {
              name: 'tableBorder',
              hidden: false
            },
            {
              name: 'tableHeaderBorder',
              hidden: false
            },
            {
              name: 'tableHeaderCellBorder',
              hidden: false
            },
            {
              name: 'tableHeaderRowHeight',
              hidden: false
            },
            {
              name: 'tableHeaderBackground',
              hidden: false
            },
            {
              name: 'tableHeaderFontSize',
              hidden: false
            },
            {
              name: 'tableHeaderFontWeight',
              hidden: false
            },
            {
              name: 'tableBodyRowHeight',
              hidden: false
            },
            {
              name: 'tableBodyRowBorder',
              hidden: false
            },
            {
              name: 'tableBodyCellBorder',
              hidden: false
            },
            {
              name: 'tableFooterBorder',
              hidden: false
            },
            {
              name: 'tableFooterCellBorder',
              hidden: false
            },
            {
              name: 'lHeight',
              hidden: false
            }]
        },
        // 留空即显示 表格 列 属性
        {
          name: '列', options: []
        }],
      supportOptions: [
        {
          name: 'field',
          hidden: false
        },
        {
          name: 'coordinate',
          hidden: false
        },
        {
          name: 'widthHeight',
          hidden: false
        },
        {
          name: 'fontFamily',
          hidden: false
        },
        {
          name: 'fontSize',
          hidden: false
        },
        {
          name: 'lineHeight',
          hidden: false
        },
        {
          name: 'textAlign',
          hidden: false
        },
        {
          name: 'gridColumns',
          hidden: false
        },
        {
          name: 'gridColumnsGutter',
          hidden: false
        },
        {
          name: 'tableHeaderRepeat',
          hidden: false
        },
        {
          name: 'tableBorder',
          hidden: false
        },
        {
          name: 'tableHeaderBorder',
          hidden: false
        },
        {
          name: 'tableHeaderCellBorder',
          hidden: false
        },
        {
          name: 'tableHeaderRowHeight',
          hidden: false
        },
        {
          name: 'tableHeaderBackground',
          hidden: false
        },
        {
          name: 'tableHeaderFontSize',
          hidden: false
        },
        {
          name: 'tableHeaderFontWeight',
          hidden: false
        },
        {
          name: 'tableBodyRowHeight',
          hidden: false
        },
        {
          name: 'tableBodyRowBorder',
          hidden: false
        },
        {
          name: 'tableBodyCellBorder',
          hidden: false
        },
        {
          name: 'tableFooterBorder',
          hidden: false
        },
        {
          name: 'tableFooterCellBorder',
          hidden: false
        },
        {
          name: 'axis',
          hidden: false
        },
        {
          name: 'lHeight',
          hidden: false
        },
        {
          name: 'autoCompletion',
          hidden: false
        },
        {
          name: 'maxRows',
          hidden: false
        },
        {
          name: 'columns',
          hidden: false
        },
        {
          name: 'styler',
          hidden: true
        },
        {
          name: 'rowStyler',
          hidden: true
        },
        {
          name: 'tableFooterRepeat',
          hidden: false
        },
        {
          name: 'footerFormatter',
          hidden: true
        },
        {
          name: 'rowsColumnsMerge',
          hidden: true
        },
        {
          name: 'rowsColumnsMergeClean',
          hidden: true
        },
        {
          name: 'groupSequenceContinue',
          hidden: true
        },
        {
          name: 'groupFieldsFormatter',
          hidden: true
        },
        {
          name: 'groupFormatter',
          hidden: true
        },
        {
          name: 'groupFooterFormatter',
          hidden: true
        },
        {
          name: 'gridColumnsFooterFormatter',
          hidden: true
        }
      ],
      default: {
        width: 300,
        tableHeaderBackground: '',
        tableHeaderRowHeight: 25,
        tableBodyRowHeight: 25,
      }
    },
    hline: {
      tabs: [
        {
          name: '基础', options: [
            {
              name: 'coordinate',
              hidden: false
            },
            {
              name: 'widthHeight',
              hidden: false
            },
            {
              name: 'showInPage',
              hidden: false
            },
            {
              name: 'fixed',
              hidden: false
            }]
        },
        {
          name: '样式', options: [
            {
              name: 'borderWidth',
              hidden: false
            },
            {
              name: 'borderStyle',
              hidden: false
            },
            {
              name: 'borderColor',
              hidden: false
            },
            {
              name: 'transform',
              hidden: false
            },
            {
              name: 'zIndex',
              hidden: false
            }]
        }],
      supportOptions: [
        {
          name: 'coordinate',
          hidden: false
        },
        {
          name: 'widthHeight',
          hidden: false
        },
        {
          name: 'borderWidth',
          hidden: false
        },
        {
          name: 'borderStyle',
          hidden: false
        },
        {
          name: 'borderColor',
          hidden: false
        },
        {
          name: 'pageBreak',
          hidden: false
        },
        {
          name: 'showInPage',
          hidden: false
        },
        {
          name: 'fixed',
          hidden: false
        },
        {
          name: 'axis',
          hidden: false
        },
        {
          name: 'transform',
          hidden: false
        },
        {
          name: 'zIndex',
          hidden: false
        }],
      default: {
        borderWidth: 0.75,
        height: 9,
        width: 90
      }
    },
    vline: {
      tabs: [
        {
          name: '基础', options: [
            {
              name: 'coordinate',
              hidden: false
            },
            {
              name: 'widthHeight',
              hidden: false
            },
            {
              name: 'showInPage',
              hidden: false
            },
            {
              name: 'fixed',
              hidden: false
            }]
        },
        {
          name: '样式', options: [
            {
              name: 'borderWidth',
              hidden: false
            },
            {
              name: 'borderStyle',
              hidden: false
            },
            {
              name: 'borderColor',
              hidden: false
            },
            {
              name: 'transform',
              hidden: false
            },
            {
              name: 'zIndex',
              hidden: false
            }]
        }],
      supportOptions: [
        {
          name: 'coordinate',
          hidden: false
        },
        {
          name: 'widthHeight',
          hidden: false
        },
        {
          name: 'borderWidth',
          hidden: false
        },
        {
          name: 'borderStyle',
          hidden: false
        },
        {
          name: 'borderColor',
          hidden: false
        },
        {
          name: 'pageBreak',
          hidden: false
        },
        {
          name: 'showInPage',
          hidden: false
        },
        {
          name: 'fixed',
          hidden: false
        },
        {
          name: 'axis',
          hidden: false
        },
        {
          name: 'transform',
          hidden: false
        },
        {
          name: 'zIndex',
          hidden: false
        }],
      default: {
        borderWidth: undefined,
        height: 90,
        width: 9
      }
    },
    rect: {
      tabs: [
        {
          name: '基础', options: [
            {
              name: 'coordinate',
              hidden: false
            },
            {
              name: 'widthHeight',
              hidden: false
            },
            {
              name: 'showInPage',
              hidden: false
            },
            {
              name: 'fixed',
              hidden: false
            }]
        },
        {
          name: '样式', options: [
            {
              name: 'borderWidth',
              hidden: false
            },
            {
              name: 'borderStyle',
              hidden: false
            },
            {
              name: 'borderColor',
              hidden: false
            },
            {
              name: 'backgroundColor',
              hidden: false
            },
            {
              name: 'transform',
              hidden: false
            },
            {
              name: 'zIndex',
              hidden: false
            }]
        }],
      supportOptions: [
        {
          name: 'coordinate',
          hidden: false
        },
        {
          name: 'widthHeight',
          hidden: false
        },
        {
          name: 'borderWidth',
          hidden: false
        },
        {
          name: 'borderStyle',
          hidden: false
        },
        {
          name: 'borderColor',
          hidden: false
        },
        {
          name: 'backgroundColor',
          hidden: false
        },
        {
          name: 'pageBreak',
          hidden: false
        },
        {
          name: 'showInPage',
          hidden: false
        },
        {
          name: 'fixed',
          hidden: false
        },
        {
          name: 'axis',
          hidden: false
        },
        {
          name: 'transform',
          hidden: false
        },
        {
          name: 'zIndex',
          hidden: false
        }],
      default: {
        borderWidth: undefined,
        height: 90,
        width: 90,
        backgroundColor: '',
        borderColor: '',
      }
    },
    oval: {
      tabs: [
        {
          name: '基础', options: [
            {
              name: 'coordinate',
              hidden: false
            },
            {
              name: 'widthHeight',
              hidden: false
            },
            {
              name: 'showInPage',
              hidden: false
            },
            {
              name: 'fixed',
              hidden: false
            }]
        },
        {
          name: '样式', options: [
            {
              name: 'borderWidth',
              hidden: false
            },
            {
              name: 'borderStyle',
              hidden: false
            },
            {
              name: 'borderColor',
              hidden: false
            },
            {
              name: 'backgroundColor',
              hidden: false
            },
            {
              name: 'transform',
              hidden: false
            },
            {
              name: 'zIndex',
              hidden: false
            }]
        }],
      supportOptions: [
        {
          name: 'coordinate',
          hidden: false
        },
        {
          name: 'widthHeight',
          hidden: false
        },
        {
          name: 'borderWidth',
          hidden: false
        },
        {
          name: 'borderStyle',
          hidden: false
        },
        {
          name: 'borderColor',
          hidden: false
        },
        {
          name: 'backgroundColor',
          hidden: false
        },
        {
          name: 'pageBreak',
          hidden: false
        },
        {
          name: 'showInPage',
          hidden: false
        },
        {
          name: 'fixed',
          hidden: false
        },
        {
          name: 'axis',
          hidden: false
        },
        {
          name: 'transform',
          hidden: false
        },
        {
          name: 'zIndex',
          hidden: false
        }
      ],
      default: {
        borderWidth: undefined,
        height: 90,
        width: 90,
        backgroundColor: '',
        borderColor: '',
      }
    },
    html: {
      tabs: [
        {
          name: '基础', options: [
            {
              name: 'coordinate',
              hidden: false
            },
            {
              name: 'widthHeight',
              hidden: false
            },
            {
              name: 'showInPage',
              hidden: false
            },
            {
              name: 'unShowInPage',
              hidden: false
            },
            {
              name: 'fixed',
              hidden: false
            }]
        },
        {
          name: '样式', options: [
            {
              name: 'transform',
              hidden: false
            },
            {
              name: 'zIndex',
              hidden: false
            }]
        }],
      supportOptions: [
        {
          name: 'coordinate',
          hidden: false
        },
        {
          name: 'widthHeight',
          hidden: false
        },
        {
          name: 'pageBreak',
          hidden: false
        },
        {
          name: 'showInPage',
          hidden: false
        },
        {
          name: 'unShowInPage',
          hidden: false
        },
        {
          name: 'fixed',
          hidden: false
        },
        {
          name: 'zIndex',
          hidden: false
        },
        {
          name: 'axis',
          hidden: false
        },
        {
          name: 'formatter',
          hidden: true
        }
      ],
      default: {
        height: 90,
        width: 90
      }
    },
    tableColumn: {
      supportOptions: [
        {
          name: 'title',
          hidden: false
        },
        {
          name: 'field',
          hidden: false
        },
        {
          name: 'align',
          hidden: false
        },
        {
          name: 'halign',
          hidden: false
        },
        {
          name: 'vAlign',
          hidden: false
        },
        {
          name: 'tableTextType',
          hidden: false
        },
        {
          name: 'tableBarcodeMode',
          hidden: false
        },
        {
          name: 'tableQRCodeLevel',
          hidden: false
        },
        {
          name: 'tableColumnHeight',
          hidden: false
        },
        {
          // 表格条码底部是否显示内容
          name: 'showCodeTitle',
          hidden: false,
        },
        {
          name: 'paddingLeft',
          hidden: false
        },
        {
          name: 'paddingRight',
          hidden: false
        },
        {
          name: 'tableSummaryTitle',
          hidden: false
        },
        {
          name: 'tableSummaryText',
          hidden: false
        },
        {
          name: 'tableSummaryColspan',
          hidden: false
        },
        {
          name: 'tableSummary',
          hidden: false
        },
        {
          name: 'tableSummaryAlign',
          hidden: false
        },
        {
          name: 'tableSummaryNumFormat',
          hidden: false
        },

        {
          name: 'tableSummaryFormatter',
          hidden: true
        },
        {
          name: 'upperCase',
          hidden: true
        },

        {
          name: 'renderFormatter',
          hidden: true
        },
        {
          name: 'formatter2',
          hidden: true
        },
        {
          name: 'styler2',
          hidden: true
        },
        {
          name: 'stylerHeader',
          hidden: true
        }],
      default: {
        height: 90,
        width: 90
      }
    },
    barcode: {
      tabs: [{
        name: '基础',
        options: [{
          name: 'title',
          hidden: false
        }, {
          name: 'field',
          hidden: false
        }, {
          name: 'testData',
          hidden: false
        }, {
          name: 'barcodeType',
          hidden: false
        }, {
          name: 'barWidth',
          hidden: false
        }, {
          name: 'barAutoWidth',
          hidden: false
        }, {
          name: 'coordinate',
          hidden: false
        }, {
          name: 'widthHeight',
          hidden: false
        }, {
          name: 'hideTitle',
          hidden: false
        }, {
          name: 'fixed',
          hidden: false
        }]
      }, {
        name: '样式',
        options: [{
          name: 'fontFamily',
          hidden: false
        }, {
          name: 'fontSize',
          hidden: false
        }, {
          name: 'fontWeight',
          hidden: false
        }, {
          name: 'letterSpacing',
          hidden: false
        }, {
          name: 'color',
          hidden: false
        }, {
          name: 'backgroundColor',
          hidden: false
        }, {
          name: 'barColor',
          hidden: false
        }, {
          name: 'textAlign',
          hidden: false
        }, {
          name: 'textContentVerticalAlign',
          hidden: false
        }, {
          name: 'lineHeight',
          hidden: false
        }, {
          name: 'transform',
          hidden: false
        }, {
          name: 'zIndex',
          hidden: false
        }]
      }],
      supportOptions: [{
        name: 'title',
        hidden:false
      }, {
        name: 'field',
        hidden:false
      }, {
        name: 'testData',
        hidden:false
      }, {
        name: 'barcodeType',
        hidden:false
      }, {
        name: 'barWidth',
        hidden: false
      }, {
        name: 'barAutoWidth',
        hidden: false
      }, {
        name: 'coordinate',
        hidden:false
      }, {
        name: 'widthHeight',
        hidden:false
      }, {
        name: 'hideTitle',
        hidden:false
      }, {
        name: 'fixed',
        hidden:false
      }, {
        name: 'fontFamily',
        hidden:false
      }, {
        name: 'fontSize',
        hidden:false
      }, {
        name: 'fontWeight',
        hidden:false
      }, {
        name: 'letterSpacing',
        hidden:false
      }, {
        name: 'color',
        hidden:false
      }, {
        name: 'backgroundColor',
        hidden:false
      }, {
        name: 'barColor',
        hidden:false
      }, {
        name: 'textAlign',
        hidden:false
      }, {
        name: 'textContentVerticalAlign',
        hidden:false
      }, {
        name: 'lineHeight',
        hidden:false
      }, {
        name: 'transform',
        hidden:false
      }, {
        name: 'zIndex',
        hidden:false
      }, {
        name: 'pageBreak',
        hidden:false
      }, {
        name: 'showInPage',
        hidden:false
      }, {
        name: 'unShowInPage',
        hidden:false
      }, {
        name: 'axis',
        hidden:false
      }, {
        name: 'formatter',
        hidden:false
      }, {
        name: 'styler',
        hidden:false
      }],
      default: {
        width: 160,
        height: 40,
        title: '条形码',
        backgroundColor: '',
        barcodeType: 'code128',
        testData: 'barcode'
        // barAutoWidth: 'true' 这里必须使用字符串
      }
    },
    qrcode: {
      tabs: [{
        name: '基础',
        options: [{
          name: 'title',
          hidden: false
        }, {
          name: 'field',
          hidden: false
        }, {
          name: 'testData',
          hidden: false
        }, {
          name: 'qrcodeType',
          hidden: false
        }, {
          name: 'qrCodeLevel',
          hidden: false
        }, {
          name: 'coordinate',
          hidden: false
        }, {
          name: 'widthHeight',
          hidden: false
        }, {
          name: 'hideTitle',
          hidden: false
        }, {
          name: 'fixed',
          hidden: false
        }]
      }, {
        name: '样式',
        options: [{
          name: 'fontFamily',
          hidden: false
        }, {
          name: 'fontSize',
          hidden: false
        }, {
          name: 'fontWeight',
          hidden: false
        }, {
          name: 'letterSpacing',
          hidden: false
        }, {
          name: 'color',
          hidden: false
        }, {
          name: 'backgroundColor',
          hidden: false
        }, {
          name: 'barColor',
          hidden: false
        }, {
          name: 'textAlign',
          hidden: false
        }, {
          name: 'textContentVerticalAlign',
          hidden: false
        }, {
          name: 'lineHeight',
          hidden: false
        }, {
          name: 'transform',
          hidden: false
        }, {
          name: 'zIndex',
          hidden: false
        }]
      }],
      supportOptions: [{
        name: 'title',
        hidden:false
      }, {
        name: 'field',
        hidden:false
      }, {
        name: 'testData',
        hidden:false
      }, {
        name: 'qrcodeType',
        hidden:false
      }, {
        name: 'qrCodeLevel',
        hidden:false
      }, {
        name: 'coordinate',
        hidden:false
      }, {
        name: 'widthHeight',
        hidden:false
      }, {
        name: 'hideTitle',
        hidden:false
      }, {
        name: 'fixed',
        hidden:false
      }, {
        name: 'fontFamily',
        hidden:false
      }, {
        name: 'fontSize',
        hidden:false
      }, {
        name: 'fontWeight',
        hidden:false
      }, {
        name: 'letterSpacing',
        hidden:false
      }, {
        name: 'color',
        hidden:false
      }, {
        name: 'backgroundColor',
        hidden:false
      }, {
        name: 'barColor',
        hidden: false
      }, {
        name: 'textAlign',
        hidden:false
      }, {
        name: 'textContentVerticalAlign',
        hidden:false
      }, {
        name: 'lineHeight',
        hidden:false
      }, {
        name: 'transform',
        hidden:false
      }, {
        name: 'zIndex',
        hidden:false
      }, {
        name: 'pageBreak',
        hidden:false
      }, {
        name: 'showInPage',
        hidden:false
      }, {
        name: 'unShowInPage',
        hidden:false
      }, {
        name: 'axis',
        hidden:false
      }, {
        name: 'formatter',
        hidden:false
      }, {
        name: 'styler',
        hidden:false
      }],
      default: {
        width: 80,
        height: 80,
        title: '二维码',
        backgroundColor: '',
        qrcodeType: 'qrcode',
        testData: 'qrcode'
      }
    }
  }
})();
