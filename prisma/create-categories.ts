// import { prisma } from "../lib/prisma";

// async function createForumCategories() {
//   const result = await prisma.forumCategory.createMany({
//     data: [
//       {
//         name: "General Topic",
//         slug: "general-topic",
//       },
//       {
//         name: "America",
//         slug: "america",
//       },
//       {
//         name: "APEC",
//         slug: "apec",
//       },
//       {
//         name: "EMEA",
//         slug: "emea",
//       },
//       {
//         name: "Crypto",
//         slug: "crypto",
//       },
//       {
//         name: "Currency",
//         slug: "currency",
//       },
//       {
//         name: "Futures",
//         slug: "futures",
//       },
//     ],
//     skipDuplicates: true,
//   });

//   console.log(`Created ${result.count} categories.`);
// }

// createForumCategories()
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
