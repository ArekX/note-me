import { PageProps } from "$fresh/server.ts";
import { db } from "$backend/database.ts";

export default function Greet(props: PageProps) {
  db.selectFrom("user").where("id", "=", 1).select([
    "username",
    "id",
  ]).execute().then(console.log);

  return <div>Hello {props.params.name}</div>;
}
