// ============================================================
// config.js — Variáveis globais e configurações
// Carregado PRIMEIRO pelos outros arquivos JS
// ============================================================

const API_URL = "https://script.google.com/macros/s/AKfycbynawGnueI1mvReoIlZt_-bTmR_sFSjIyxfpMcu4pfORPkVlKAr4mzjnQ7HuiTqd_xr/exec";

// Dados globais (preenchidos pelo loadData via API)
let DATA          = null;
let ESTOQUE_DATA  = [];
let KPIS_ESTOQUE  = {};
let RUPTURAS_DATA = [];
let INSIGHTS_DATA = { alta: [], queda: [], parado: [], oportunidade: [] };
let PROJ_DATA     = [];
