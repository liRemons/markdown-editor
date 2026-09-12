#### DOM

- 文档对象模型：用来描绘一个层次化的节点树，允许开发人员获取、添加、移除、修改页面的某一部分元素

  * 获取节点

  ```javascript
  getElementById('id') //：获取特定ID元素的节点
  getElementsByTagName('p') //：获取相同元素的节点列表，返回类数组，使用[0]来获取
  getElementsByClassName('class') //：获取相同类名的节点列表（IE8以下不支持），返回类数组
  querySelecter('.class') //：通过选择器获取元素
  querySelecterAll('.class') //：通过选择器获取元素，可获取多个元素
  firstChild() 
  llastChild()
  childNodes()
  previousSibling()
  nextSibling()
  document.documentElement //: 获取html标签元素
  document.body //：获取html标签元素
  ```

  * 节点操作

    ```javascript
    // 创建节点
    createElement
    createAttribute
    createTextNode
    //插入节点
    appendChild  
    insertBefore
    //替换节点
    repalceChild
    //删除节点
    removeChild
    //复制节点
    cloneNode
    ```
  * 属性操作

    ```javascript
    //获取属性
    getAttribute
    //设置属性
    setAttribute
    //删除属性
    removeAttribute
    ```
  * 文本操作

    ```javascript
    insertData(offset,String)
    appendData(string)
    deleteData(offset,count)
    replaceData(offset,count,string)
    splitData(offset)
    substring(offset,count)
    ```

#### BOM

- 浏览器对象模型：用于描述与浏览器进行交互的方法和接口

  ```javascript
  document //对象
  location //对象
  href//属性：控制浏览器地址栏的内容
  	reload(true)//方法：刷新页面，如果参数为true，通过缓存刷新
  	navigator// 对象
  	userAgent//：用户代理信息，该属性可获取浏览器及操作系统信息
  screen// 对象
  window //对象（核心，既是通过js访问浏览器窗口的一个接口，又是ECMAScript规定的全局对象）
  //内置对象和方法：
  //常用事件：
  onload//：页面内容加载完成（DOM结构，图片）
  onscroll//: 拖动浏览器的滚动条触发此事件
  onresize//： 浏览器窗口缩放所触发的事件
  //可视区的宽高：
  document.documentElement.clientWidth
  document.documentElement.clientHeight
  ```
