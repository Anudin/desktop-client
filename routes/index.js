var express = require('express');
var router = express.Router();
const {spawn} = require("child_process");

router.post('/open', function (req, res) {
    console.log(req.body);
    spawn("google-chrome", [req.body.URL]);
    res.status(200).send();
});

module.exports = router;
