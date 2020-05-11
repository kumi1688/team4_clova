const express = require('express');
const cekRequest = require('../clova');
const { json } = require('../http');
const router = express.Router();

router.post('/', json(cekRequest)); // 모든 요청은 clova 폴더의 clova 모듈에 전달함

module.exports = router;
