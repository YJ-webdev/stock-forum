// @ts-check
import { module } from "@prisma/composer";
import stockForumService from "./service.mjs";

export default module("stock-forum", ({ provision }) => {
  provision(stockForumService, { id: "stockforum" });
});
