import { PageProps } from "$fresh/server.ts";
import { db } from "$backend/database.ts";

export default function Greet(props: PageProps) {
  const data = db.selectFrom("person").where("id", "=", 1).select([
    "first_name",
    "id",
  ]).execute();

  console.log(data);

  return <div>Hello {props.params.name}</div>;
}
