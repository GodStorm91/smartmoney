import{k as h,aS as m,j as o,aR as c}from"./index-LxrS-5__.js";/**
 * @license lucide-react v0.554.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]],k=h("zap",p),w=({checked:a,defaultChecked:i=!1,onChange:e,disabled:s=!1,className:l})=>{const[u,f]=m.useState(i),n=a!==void 0,t=n?a:u,d=()=>{if(s)return;const r=!t;n||f(r),e==null||e(r)};return o.jsx("button",{type:"button",role:"switch","aria-checked":t,disabled:s,onClick:d,className:c("relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",t?"bg-primary-600":"bg-gray-200 dark:bg-gray-700",s&&"opacity-50 cursor-not-allowed",l),children:o.jsx("span",{className:c("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",t?"translate-x-6":"translate-x-1")})})};export{w as S,k as Z};
