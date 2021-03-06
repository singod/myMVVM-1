'use strict';

(function () {
    function Mv (all) {
        this._init(all);
    }

    let self = Mv.fn = Mv.prototype;

    Mv.prototype._init = all => {

        //获取配置值
        self._el = all.el;
        self._dom = document.querySelector(self._el);

        // 处理data值
        self._data = all.data || {};
        Object.assign(self, self._data);

        // 将methods定义的方法代理到实例化对象上
        self._methods = all.methods || {};
        Object.assign(self, self._methods);

        // 数据变化时，每个指令执行的动作列表
        self._dependList = {};

        self._el ? self._getDom(self._dom, self._data) : console.error('error: 没有设置 el');
    };

    //遍历dom树，解析模板
    Mv.prototype._getDom = (template, data) => {

        // 浅度复制数组，防止DOM实时变动带来的影响
        let domList = Array.prototype.slice.call(template.childNodes, 0);

        domList.forEach(dom => {
            if (dom.nodeType === 1) {
                self._getAttr(dom, data);
                self._getDom(dom, data);
            } else if (dom.nodeType === 3 && dom.nodeValue) {

                // Text节点{{}}模板解析
                self._compileText(dom, data);
            }
        });
    };

    // 获取dom中的指令并解析
    Mv.prototype._getAttr = (dom, data) => {
        if (dom.attributes.length) Array.prototype.forEach.call(dom.attributes, attr => {
            let name = attr.name;

            if (name.includes('v-on')) {
                self._directiveList['on'](dom, attr, data);
            } else if (self._directiveList.hasOwnProperty(name)) {
                self._directiveList[name](dom, attr.value, data);
            }
        });
    };

    // 编译文本节点中的{{}}模板
    Mv.prototype._compileText = (dom, data) => {
        let tem = dom.textContent.split(/{{(.*?)}}/);

        if (tem.length > 1) tem = tem.map((item, i) => {
            if (i % 2) {

                // 如果存在{{}}那么中间的值一定存在于数组的奇数位元素中
                self.registerDataChange(data, item, () => {
                    tem[i] = self._getCompileValue(item, data);
                    dom.nodeValue = tem.join('');
                });

                return self._getCompileValue(item, data);
            } else {

                return item;
            }
        });
    };

    // 解析指令中的表达式, 返回解析的值
    Mv.prototype._getCompileValue = (value, data) => {
        if (value.includes('.') || value.includes('[')) {

            return eval('data.' + value);
        } else {

            return data[value];
        }
    };

    // 解析指令中的表达式, 返回data中的值
    Mv.prototype._setCompileValue = (value, data, newValue) => {
        if (value.includes('.') || value.includes('[')) {
            eval('data.' + value + '= newValue');

            // 用字符串解析的方式解析嵌套表达式
            /*let valList = value.split('.'),
                then = valList.slice(0, -1).reduce((obj, val) => {

                    return obj[val];
                }, data);

            then[valList[valList.length - 1]] = newValue;*/
        } else {
            data[value] = newValue;
        }
    };

    /**
     * 将data用Object.defineProperty代理一遍
     * */

    Mv.prototype._defineProperty = (data, attr) => {
        let observerObj = {},
            obj = '',
            val = '';

        if (attr.includes('.')) {
            let attrList = attr.split('.');

            observerObj = eval('data.' + attrList.slice(0, -1).join(''));
            obj = attrList[attrList.length - 1];
            val = eval('data.' + attr);
        } else {
            observerObj = data;
            obj = attr;
            val = data[attr];
        }

        Object.defineProperty(observerObj, obj, {
            get () {
                return val;
            },

            set (newValue) {
                if (val === newValue) return false;
                val = newValue;
                self._dependList[attr].forEach(fn => fn(val));
            }
        });
    };

    /**
     * 注册data变化后对应的执行队列
     * data：当前作用域下的data
     * attr: 注册的标签
     * fn: data变化后执行的回调
     * */

    Mv.prototype.registerDataChange =  (data, attr, fn) => {
        if (!(self._dependList[attr] instanceof Array)) self._dependList[attr] = [];
        if (typeof fn === 'function') {
            self._dependList[attr].push(fn);
            fn(self._getCompileValue(attr, data) || '');
        }
    };

    /**
     * 自定义标签
     * attr: 标签名
     * fn: 检测到标签时执行的回调函数
     * */

    Mv.directive =  (attr, fn) => {
        if (!self._directiveList.hasOwnProperty(attr)) self._directiveList[attr] = fn;
    };

    // 指令列表
    Mv.prototype._directiveList = {};

    /**
     * 开始注册指令
     * dom：当前检测到具有该指令的节点
     * attr：指令的值
     * data：作用域中的data
     * */

    Mv.directive('f-model', (dom, attrVal, data) => {
        let dependList = self._dependList[attrVal];

        if (!dependList) {
            Mv.error('f-model: 未找到绑定的字段！');

            return false;
        }
        dom.addEventListener('input', () => dependList.forEach(() => self._setCompileValue(attrVal, data, dom.value)));
        self.registerDataChange(data, attrVal, () => dom.value = self._getCompileValue(attrVal, data));
        self._defineProperty(data, attrVal);
    });

    Mv.directive('f-text', (dom, attrVal, data) => {
        self.registerDataChange(data, attrVal, () => dom.innerHTML = self._getCompileValue(attrVal, data));
    });

    Mv.directive('f-show', (dom, attrVal, data) => {
        if (attrVal === 'false' || (!isNaN(Number(attrVal) && !Number(attrVal)))) {
            dom.style.display = 'none';
        } else {
            self.registerDataChange(data, attrVal, () => {
                dom.style.display = self._getCompileValue(attrVal, data) ? '' : 'none';
            });
            self._defineProperty(data, attrVal);
        }
    });

    Mv.directive('f-hide', (dom, attrVal, data) => {
        if (attrVal === 'false' || (!isNaN(Number(attrVal) && !Number(attrVal)))) {
            dom.style.display = '';
        } else {
            self.registerDataChange(data, attrVal, () => {
                dom.style.display = self._getCompileValue(attrVal, data) ? 'none' : '';
            });
            self._defineProperty(data, attrVal);
        }
    });

    Mv.directive('f-if', (dom, attrVal, data) => {
        let state = true, // dom当前的状态
            parent = dom.parentNode,
            comment = document.createComment('f-if ' + attrVal), // 创建注释节点，用于标节点位置
            fragment = document.createDocumentFragment();

        parent.insertBefore(comment, dom);

        // 解析attrVal的值，是false或者0时删除dom，后续不会再有变化
        if (attrVal === 'false' || (!isNaN(Number(attrVal) && !Number(attrVal)))) {
            dom.remove();
        } else {
            self.registerDataChange(data, attrVal, () => {
                if (state && !self._getCompileValue(attrVal, data)) { // 有节点，false
                    comment.nextSibling.remove();
                    state = false;
                } else if (!state && self._getCompileValue(attrVal, data)) { // 没有节点，true
                    let cloneDom = dom.cloneNode(true);

                    fragment.appendChild(cloneDom);
                    self._getDom(fragment.children[0], data);
                    if (parent.lastChild === comment) {
                        parent.appendChild(fragment);
                    } else {
                        parent.insertBefore(fragment, comment.nextSibling);
                    }
                    state = true;
                }
            });
            self._defineProperty(data, attrVal);
        }
    });

    Mv.directive('f-for', (dom, attrVal, data) => {
        let attrString = attrVal.split('in'),
            item = attrString[0].replace(/\s/g, ''),
            items = attrString[1].replace(/\s/g, '');

        dom.removeAttribute('f-for');
        if (items.includes('.') || items.includes('[')) {
            items = eval('data.' + items);
        } else {
            items = data[items];
        }
        if (items instanceof Array) {

            // 劫持数据监控数组改变


            items.forEach((val, i) => {
                let node = dom.cloneNode(true);

                // dom处理完毕开始继续进行编辑
                self._getDom(node, {
                    [item]: val
                });

                dom.parentNode.insertBefore(node, dom);
            });

            // 去掉自身，防止多出一个
            dom.remove();
        } else {
            Mv.error('f-for：遍历的数据格式不正确！');
        }
    });

    // f-on，绑定DOM事件，PS：第二个参数是dom属性对象而不是的属性值,有别于其他标签
    Mv.directive('on', (dom, attr, data) => {
        let event = attr.name.split(':')[1], // 事件名称
            attrSplit = attr.value.split(/\(|,|\)/),
            method = attrSplit[0], // 方法名称
            inputList = attrSplit.slice(1, -1); // 入参列表

        // 记录$event所在的位置，事件发生时注入
        let $eventIndex = -1;

        // 解析入参，1-number、2-$event、3-string、4-直接变量、5-嵌套变量
        // $event在事件出发后注入
        inputList = inputList.map((input, index) => {
            input = input.replace(' ', '');

            if (!isNaN(Number(input))) {
                return Number(input);
            } else if (input === '$event') {
                $eventIndex !== -1 ? Mv.error('v-on--不能传入多个$event') : $eventIndex = index;

                return '$event';
            } else if (input[0] === '\'' || input[0] === '\"') {
                let start = input[0],
                    end = input.substr(-1);

                // 开头结尾均是'或者"，则为字符串
                if (start === '\'' && end === '\'') {
                    return input.split('\'')[1];
                } else if (start === '\"' && end === '\"') {
                    return input.split('\"')[1];
                }
            } else {
                return self._getCompileValue(input, data);
            }
        });

        dom.addEventListener(event, e => {
            if (self._methods.hasOwnProperty(method)) {
                if ($eventIndex !== -1) inputList[$eventIndex] = e;
                self._methods[method].apply(self, inputList);
            } else {
                Mv.error('找不到方法--' + method);
            }
        });
    });

    /**
     * define方法，用于实现内部的模块化以及依赖注入，先放在这里，可能会用得上
     * 定义內建标签，目前只处理了箭头函数的传入，没有处理function关键字的传入
     * name:模块名称
     * fn:返回模块对象
     * */

    Mv.define = (name, fn) => {
        Mv.define.modelList = Mv.define.modelList || {};
        let modelList = Mv.define.modelList;

        // 获取依赖的列表
        let fnString = fn.toString().split('=>')[0];

        if (fnString !== '()') {
            modelList[name] = fn();
        } else if (fnString.includes('(')) {
            let dependString = fnString.slice(1, -1),
                dependList = dependString.split(',');

            // 是否查找到了依赖模块
            let hasModel = true;

            // 查找依赖的模块，返回给dependList
            if (dependList.length) dependList = dependList.map(model => {
                if (modelList[model]) {

                    return modelList[model];
                } else {
                    hasModel = false;
                    Mv.error('没有查找到依赖的模块');
                }
            });

            if (hasModel) modelList[name] = fn.apply(this, dependList);
        } else {
            modelList[name] = fn(modelList[fnString]);
        }
    };

    Mv.error = msg => {
        console.error('Error:' + msg);
    };

    Mv.define('self',  () => Mv.prototype);

    Mv.define('init', self => {

    });

    /**
     * 劫持数组对数组进行监控
     * */

    class ArrayObseve {
        constructor(array = [], callBack = () => {}) {
            this.array = array;
            this.fn = callBack;

            // 支持的数组异变方法
            this.type = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
        }
        observe() {

        }
    }

    /**
     * 对标签值进行编译，
     * 两种模式：表达式、单个值
     * 功能：返回编译后的值以及提取其中可能的变量
     * attrValue：标签值
     * */

    class Compile {
        constructor(attrValue) {

        }
        setValue(value, data, newValue)  {
            if (value.includes('.') || value.includes('[')) {
                eval('data.' + value + '= newValue');

                // 用字符串解析的方式解析嵌套表达式
                /*let valList = value.split('.'),
                 then = valList.slice(0, -1).reduce((obj, val) => {

                 return obj[val];
                 }, data);

                 then[valList[valList.length - 1]] = newValue;*/
            } else {
                data[value] = newValue;
            }
        }
        getValue(value, data) {
            if (value.includes('.') || value.includes('[')) {

                return eval('data.' + value);
            } else {

                return data[value];
            }
        }
    }

    window.Mv = Mv;
})();