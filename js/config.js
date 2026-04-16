// ============================================================
// config.js — Variáveis globais e configurações
// Carregado PRIMEIRO pelos outros arquivos JS
// ============================================================

const API_URL = "https://script.google.com/macros/s/AKfycbwn8FDdXhWv3Hmu0m4GxUJ6LJHgUXoWm9oo0ugr2345QuYB92V4T35n7bVMzHGJww/exec";

// Dados globais (preenchidos pelo loadData via API)
let DATA          = null;
let ESTOQUE_DATA  = [];
let KPIS_ESTOQUE  = {};
let RUPTURAS_DATA = [];
let INSIGHTS_DATA = { alta: [], queda: [], parado: [], oportunidade: [] };
let PROJ_DATA     = [];
