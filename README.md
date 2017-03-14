# My MVVM
做一下双向数据绑定玩玩

### 一点想法

造这个小轮的目的，一方面是希望把这作为了解前端MVVM框架实现原理的切入点，另一方面也是可以更多的
了解一下原生JS的DOM操作。

自己目前的水平还无法完全重新设计一个框架，所以语法上会参照现在热门的前端框架VUE。

### 已经实现的标签和功能

1. 嵌套对象解析
2. f-model
3. f-text && {{}}
4. f-for
5. f-if
6. f-show

### 目前正在做的

实现v-on，对DOM绑事件

##### 支持的事件
* 


### TODOList

1. 处理f-if，使其在结果为true时，对内部进行重新编译
2. 监听数组变化
3. 代码重构，优化结构

<!--
双向数据绑定的主要作用是实现数据与视图的连接，在前端MVVM框架中算是一个比较重要的组成部分了。
但是双向数据绑定本身其实并不是关键，因为原生的js在一定程度上就是双向绑定的，
js代码通过dom操作控制html结构，而html发生改变时，也可以带动相应的对象属性改变。-->
