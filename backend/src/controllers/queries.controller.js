'use strict';

const { login } = require('../services/auth.service');
const queries = require('../services/queries.service');
const { searchDeliveries } = require('../services/search.service');

async function postLogin(req, res) {
  return res.status(200).json(await login(req.body.email, req.body.password));
}

async function getMerchants(req, res) {
  return res.status(200).json({ data: await queries.listMerchants(req.user) });
}

async function getMerchantTotals(req, res) {
  const result = await queries.merchantTotals(
    req.user,
    Number(req.params.id),
    req.query.from,
    req.query.to,
  );
  return res.status(200).json(result);
}

async function getCourierStatusCounts(req, res) {
  return res.status(200).json(await queries.courierStatusCounts(req.user, Number(req.params.id)));
}

async function getCostAudit(req, res) {
  return res.status(200).json(await queries.costAudit(req.user, req.params.id));
}

async function getSearch(req, res) {
  return res.status(200).json(await searchDeliveries(req.user, req.query.q));
}

module.exports = {
  postLogin,
  getMerchants,
  getMerchantTotals,
  getCourierStatusCounts,
  getCostAudit,
  getSearch,
};
