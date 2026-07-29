import { onRequestOptions as __v1__middleware_js_onRequestOptions } from "C:\\Users\\ramef\\AppData\\Roaming\\TRAE SOLO CN\\ModularData\\ai-agent\\work-mode-projects\\6a69df5d93e658e6fcfee36a\\functions\\v1\\_middleware.js"
import { onRequest as __health_js_onRequest } from "C:\\Users\\ramef\\AppData\\Roaming\\TRAE SOLO CN\\ModularData\\ai-agent\\work-mode-projects\\6a69df5d93e658e6fcfee36a\\functions\\health.js"
import { onRequest as __img_proxy_js_onRequest } from "C:\\Users\\ramef\\AppData\\Roaming\\TRAE SOLO CN\\ModularData\\ai-agent\\work-mode-projects\\6a69df5d93e658e6fcfee36a\\functions\\img-proxy.js"
import { onRequest as __v1__middleware_js_onRequest } from "C:\\Users\\ramef\\AppData\\Roaming\\TRAE SOLO CN\\ModularData\\ai-agent\\work-mode-projects\\6a69df5d93e658e6fcfee36a\\functions\\v1\\_middleware.js"

export const routes = [
    {
      routePath: "/v1",
      mountPath: "/v1",
      method: "OPTIONS",
      middlewares: [__v1__middleware_js_onRequestOptions],
      modules: [],
    },
  {
      routePath: "/health",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__health_js_onRequest],
    },
  {
      routePath: "/img-proxy",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [__img_proxy_js_onRequest],
    },
  {
      routePath: "/v1",
      mountPath: "/v1",
      method: "",
      middlewares: [__v1__middleware_js_onRequest],
      modules: [],
    },
  ]