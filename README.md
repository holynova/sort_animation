# 排序观察室 · Sort Lab

[在线体验](https://sort-animation.xiaosang.cc/) · [GitHub](https://github.com/holynova/sort_animation)

[English](README.en.md)

在同一组数字上逐步观察冒泡、快速、归并、插入、选择、堆和鸡尾酒排序。打开时停在冒泡排序的第一次比较。下标 0 和 1 的值分别是 8 和 3，点击「下一步」即可观察它们交换位置。

![冒泡排序的第一次比较，点阵柱、步骤解析、伪代码与数组快照](assets/readme/screenshot-sorting.png)

## 如何观察

- 黑底上的白色粒子组成数值柱。比较时，粒子围绕参与运算的两列形成轨道；交换时，两团粒子解散、交叉迁移并重组；归并写入从标记为 B 的源下标汇入目标列。拖动可调整立体视角，也可切换到「正视」。点击数组格或柱子可查看对应下标和值。
- 每一步显示比较结果、交换或写入的原因，以及当时执行的伪代码。快排标出基准 P，归并比较时标明缓冲 B 的区间，底部快照始终展示主数组 A。一次交换计为两次写入。
- 左右方向键逐步前进和回退，空格播放或暂停，Home / End 跳到起点或终点。时间轴可定位任意步骤。图表右上角的「粒子流动」可单独切换动效。开启系统减弱动态时，默认呈现静态粒子。
- 支持 2–500 个元素。切换算法时复用同一组初始数据，便于对照比较次数和写入次数。

## 本地运行

使用 Node.js 20 或更新版本。

```sh
npm ci
npm test
npm run build
```

双击 `dist/index.html` 即可离线使用。开发时运行 `npm start`，打开终端打印的地址。Canvas 将三维点阵投影到二维画布，每 256 次操作保存一次数组检查点以支持回放。


推送主分支（`git push origin master`）后，Cloudflare Pages 运行 `npm run build`，发布 `dist/`。

<a href="https://sort-animation.xiaosang.cc/"><img src="assets/qr.png" width="112" alt="扫码在手机打开"></a>
