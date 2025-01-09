// ==UserScript==
// @name         MWI-Market
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description
// @author       You
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // 连接WebSocket的状态标记
  let isWebSocketConnected = false;
  // 存储采集的aria-label属性值
  let collectedLabels = new Set();
  // 当前WebSocket实例
  let ws;
  // 存储所有商品的价格信息
  let marketPrices = {};

  // 函数：连接到WebSocket并设置消息处理
  function connectWebSocket(url) {
    if (isWebSocketConnected) {
      console.log("WebSocket 已连接，跳过连接");
      return; // 如果已经连接过，则不重复连接
    }

    ws = new WebSocket(url);

    ws.onopen = () => {
      isWebSocketConnected = true;
      console.log("WebSocket 已连接到: " + url);
      document.getElementById("status").innerText = "WebSocket 已连接";
      document.getElementById("connectButton").disabled = true; // 禁用连接按钮
      document.getElementById("connectButton").visible = false; // 隐藏连接按钮

      // 保存 WebSocket 地址到本地存储
      localStorage.setItem("websocketUrl", url);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data); // 解析收到的消息
        if (message.type === "market_item_order_books_updated") {
          const marketData = message.marketItemOrderBooks;
          let itemName = marketData.itemHrid.split("/").pop(); // 从URL提取Item名称
          // 用空格替换_，并将每个单词的首字母转换为大写
          itemName = itemName.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());


          // 目标数量
          const targetQuantity = 2000;

          // 累计ask和bid的数量和价格
          let accumulatedAskPrice = 0;
          let accumulatedBidPrice = 0;
          let accumulatedAskQuantity = 0;
          let accumulatedBidQuantity = 0;

          // 计算累计到2000个商品的ask价格
          for (const ask of marketData.orderBooks[0].asks) {
            accumulatedAskQuantity += ask.quantity;
            accumulatedAskPrice += ask.quantity * ask.price;
            if (accumulatedAskQuantity >= targetQuantity) {
              break; // 当累积的商品数量达到目标数量时，停止
            }
          }

          // 计算累计到2000个商品的bid价格
          for (const bid of marketData.orderBooks[0].bids) {
            accumulatedBidQuantity += bid.quantity;
            accumulatedBidPrice += bid.quantity * bid.price;
            if (accumulatedBidQuantity >= targetQuantity) {
              break; // 当累积的商品数量达到目标数量时，停止
            }
          }

          // 计算平均ask价格和bid价格
          const averageAskPrice =
            accumulatedAskQuantity > 0
              ? accumulatedAskPrice / accumulatedAskQuantity
              : 0;
          const averageBidPrice =
            accumulatedBidQuantity > 0
              ? accumulatedBidPrice / accumulatedBidQuantity
              : 0;

          // 存储商品价格信息
          marketPrices[itemName] = {
            ask: averageAskPrice.toFixed(2),
            bid: averageBidPrice.toFixed(2),
            vendor: null, // 假设vendor价格为108
          };

          console.log(`商品 ${itemName} 的价格信息: `, marketPrices[itemName]);

          // 输出整合后的价格信息
          const consolidatedMarketData = {
            market: marketPrices,
            time: { timestamp: new Date().toISOString() },
          };
          console.log(consolidatedMarketData);
        }
      } catch (error) {
        console.error("解析消息时出错: ", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket 错误: ", error);
      document.getElementById("status").innerText = "WebSocket 错误";
    };

    ws.onclose = () => {
      isWebSocketConnected = false;
      console.log("WebSocket 连接已关闭");
      document.getElementById("status").innerText = "WebSocket 连接已关闭";
    };

    // 每隔60秒发送一个ping消息
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
        console.log("发送ping消息");
      }
    }, 60000); // 60秒发送一次ping消息
  }

  // 创建一个简单的UI用于手动输入WebSocket地址和连接
  function createUI() {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "10px";
    container.style.left = "10px";
    container.style.padding = "10px";
    container.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    container.style.color = "white";
    container.style.borderRadius = "8px";
    container.style.zIndex = 9999;
    container.style.fontFamily = "Arial, sans-serif";

    // WebSocket地址输入框
    const urlInputContainer = document.createElement("div");
    urlInputContainer.id = "urlInputContainer"; // 用于控制收起/展开
    urlInputContainer.style.display = "flex"; // 设置为flex布局
    urlInputContainer.style.alignItems = "center"; // 垂直居中对齐

    const urlInput = document.createElement("input");
    urlInput.type = "text";
    urlInput.placeholder = "输入 WebSocket 地址";
    urlInput.style.width = "300px";
    urlInput.style.padding = "5px";
    urlInput.style.marginRight = "10px"; // 添加右边距
    urlInput.style.borderRadius = "4px";

    // 从本地存储中获取 WebSocket 地址并自动填写
    const savedWebSocketUrl = localStorage.getItem("websocketUrl");
    if (savedWebSocketUrl) {
      urlInput.value = savedWebSocketUrl;
      urlInputContainer.style.display = "none"; // 默认收起状态
    }

    // 连接按钮
    const connectButton = document.createElement("button");
    connectButton.id = "connectButton"; // 为按钮设置ID，方便操作
    connectButton.textContent = "连接 WebSocket";
    connectButton.style.padding = "5px 10px";
    connectButton.style.borderRadius = "4px";
    connectButton.style.backgroundColor = "#4CAF50";
    connectButton.style.color = "white";
    connectButton.style.border = "none";
    connectButton.style.cursor = "pointer";

    // 状态信息显示
    const statusText = document.createElement("div");
    statusText.id = "status";
    statusText.style.marginTop = "10px";
    statusText.style.fontSize = "14px";
    statusText.style.color = "#f39c12";

    // 收起/展开按钮
    const toggleButton = document.createElement("button");
    toggleButton.textContent = savedWebSocketUrl ? "展开" : "收起";
    toggleButton.style.marginTop = "10px";
    toggleButton.style.padding = "5px 10px";
    toggleButton.style.borderRadius = "4px";
    toggleButton.style.backgroundColor = "#f39c12";
    toggleButton.style.color = "white";
    toggleButton.style.border = "none";
    toggleButton.style.cursor = "pointer";

    // 切换显示/隐藏输入框
    toggleButton.addEventListener("click", () => {
      const inputContainer = document.getElementById("urlInputContainer");
      if (inputContainer.style.display === "none") {
        inputContainer.style.display = "block";
        toggleButton.textContent = "收起";
      } else {
        inputContainer.style.display = "none";
        toggleButton.textContent = "展开";
      }
    });

    // 连接按钮点击事件
    connectButton.addEventListener("click", () => {
      const websocketUrl = urlInput.value.trim();
      if (websocketUrl) {
        connectWebSocket(websocketUrl); // 调用WebSocket连接函数
      } else {
        alert("请输入有效的WebSocket地址");
      }
    });

    // 创建采集Item图标的按钮
    const collectButton = document.createElement("button");
    collectButton.textContent = "采集";
    collectButton.style.marginTop = "10px";
    collectButton.style.padding = "5px 8px";
    collectButton.style.borderRadius = "4px";
    collectButton.style.backgroundColor = "#3498db";
    collectButton.style.color = "white";
    collectButton.style.border = "none";
    collectButton.style.cursor = "pointer";
    collectButton.style.fontSize = "12px"; // 设置字体大小，保持按钮小巧

    // 从本地存储中获取已采集的Item图标
    const savedCollectedLabels = localStorage.getItem("collectedLabels");
    if (savedCollectedLabels) {
      collectedLabels = new Set(JSON.parse(savedCollectedLabels));
      console.log("已加载本地存储的 Item 图标 aria-label 属性值: ", Array.from(collectedLabels));
    }

    // 按钮点击事件：采集所有Item图标的aria-label属性值
    collectButton.addEventListener("click", () => {
      // 限制查找范围，只查找 MarketplacePanel_itemSelectionTabsContainer 内的 Item_iconContainer 开头 class 的 svg
      const panelDiv = document.querySelector(
        'div[class^="MarketplacePanel_itemSelectionTabsContainer"]'
      );
      if (panelDiv) {
        const icons = panelDiv.querySelectorAll(
          '[class^="Item_iconContainer"] svg'
        );
        icons.forEach((icon) => {
          const ariaLabel = icon.getAttribute("aria-label");
          if (ariaLabel) {
            collectedLabels.add(ariaLabel); // 将新的aria-label添加到Set中，自动去重
          }
        });
        console.log(
          "当前采集到的 Item 图标 aria-label 属性值: ",
          Array.from(collectedLabels)
        );

        // 保存采集到的Item图标到本地存储
        localStorage.setItem("collectedLabels", JSON.stringify(Array.from(collectedLabels)));
      } else {
        console.log("未找到 MarketplacePanel_itemSelectionTabsContainer 面板");
      }
    });

    // 创建发送请求的按钮
    const sendRequestsButton = document.createElement("button");
    sendRequestsButton.textContent = "请求";
    sendRequestsButton.style.marginTop = "10px";
    sendRequestsButton.style.padding = "5px 8px";
    sendRequestsButton.style.borderRadius = "4px";
    sendRequestsButton.style.backgroundColor = "#e67e22";
    sendRequestsButton.style.color = "white";
    sendRequestsButton.style.border = "none";
    sendRequestsButton.style.cursor = "pointer";
    sendRequestsButton.style.fontSize = "12px";

    // 按钮点击事件：依次通过WebSocket发送请求
    sendRequestsButton.addEventListener("click", () => {
      const websocketUrl = urlInput.value.trim();
      if (!isWebSocketConnected && websocketUrl) {
        connectWebSocket(websocketUrl); // 自动连接 WebSocket
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        sendWebSocketRequests();
      } else {
        console.log("WebSocket未连接");
      }
    });

    // 将元素添加到页面
    urlInputContainer.appendChild(urlInput);
    urlInputContainer.appendChild(connectButton);
    container.appendChild(urlInputContainer);
    container.appendChild(statusText);
    container.appendChild(toggleButton);
    container.appendChild(collectButton);
    container.appendChild(sendRequestsButton);
    document.body.appendChild(container);
  }

  function sendWebSocketRequests() {
    const keywords = [
      "Donut", "Cake", "Gummy", "Yogurt", "Apple", "Orange", "Plum", "Peach",
      "Fruit", "Blueberry", "Blackberry", "Strawberry", "Mooberry", "Marsberry", "Spaceberry"
    ];

    const itemsArray = Array.from(collectedLabels).filter(itemName =>
      keywords.some(keyword => itemName.includes(keyword))
    );

    let index = 0;
    const interval = setInterval(() => {
      if (index < itemsArray.length) {
        const itemName = itemsArray[index];
        const requestPayload = {
          type: "get_market_item_order_books",
          getMarketItemOrderBooksData: {
            itemHrid: `/items/${itemName}`.toLowerCase().replace(/\s/g, "_"),
          },
        };

        // 通过WebSocket发送请求
        console.log(`通过 WebSocket 发送请求 ${itemName}: `, requestPayload);
        ws.send(JSON.stringify(requestPayload));
        index++;
      } else {
        clearInterval(interval); // 停止请求
        console.log("所有请求已发送完毕");

        // 获取 base market book
        fetch("https://raw.githubusercontent.com/holychikenz/MWIApi/main/milkyapi.json")
          .then((response) => response.json())
          .then((baseMarketBook) => {
            // 确保 baseMarketBook 格式正确
            if (!baseMarketBook.market) {
              baseMarketBook.market = {};
            }
            if (!baseMarketBook.time) {
              baseMarketBook.time = "";
            }

            // 更新 base market book
            Object.keys(marketPrices).forEach((itemName) => {
              if (baseMarketBook.market[itemName]) {
                baseMarketBook.market[itemName] = {
                  ...baseMarketBook.market[itemName],
                  ...marketPrices[itemName],
                };
              } else {
                baseMarketBook.market[itemName] = marketPrices[itemName];
              }
            });

            // 更新时间戳
            baseMarketBook.time = new Date().toISOString();

            // 发送更新后的数据到API
            fetch("https://mwi-market.vercel.app/api/upload_market_book", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(baseMarketBook),
            })
              .then((response) => response.json())
              .then((data) => {
                console.log("数据已成功发送到API: ", data);

                setInterval(() => {
                  sendWebSocketRequests();
                }, 100000);
              })
              .catch((error) =>
                console.error("发送数据到API时出错: ", error)
              );
          })
          .catch((error) =>
            console.error("获取 base market book 时出错: ", error)
          );
      }
    }, 500); // 5秒间隔发送请求
  }

  // 页面加载后创建UI
  createUI();
})();
