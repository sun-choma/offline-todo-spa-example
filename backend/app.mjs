import express from "express";
import { generate } from "random-words";

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const app = express();
app.use(express.json());
app.use(express.static("public"));

const GEN_PARAMS = { min: 3, max: 8, join: " " };
let todos = Array(3)
  .fill(0)
  .map(() => ({
    id: crypto.randomUUID(),
    text: generate(GEN_PARAMS),
  }));

app.get("/api/todos", async (_req, res) => {
  await sleepMs(200);
  res.send({ items: todos }).end();
});

app.post("/api/todos", async (req, res) => {
  await sleepMs(300);
  const itemUUID = crypto.randomUUID();
  todos.push({
    id: itemUUID,
    text: req.body.text,
  });

  res.send(itemUUID).end();
});

app.delete("/api/todos", (req, res) => {
  const requestURL = new URL(req.url, "http://localhost");
  const deletedIds = requestURL.searchParams.get("ids")?.split(",");
  todos = todos.filter((todo) => !deletedIds?.includes(todo.id));
  res.send("ok").end();
});

app.listen(process.env.PORT || "3001");
