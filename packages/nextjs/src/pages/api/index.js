import AWS from "aws-sdk";

export default async function handler(req, res) {

  res.status(200).send("hello world");
}