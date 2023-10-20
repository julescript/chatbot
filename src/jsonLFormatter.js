const fs = require("fs");

// Read the original JSON file
fs.readFile("./src/data.json", "utf8", (err, data) => {
  if (err) {
    console.error("An error occurred while reading the file:", err);
    return;
  }

  // Parse JSON to JavaScript object
  const parsedData = JSON.parse(data);

  // Initialize write stream for JSON line file
  const writeStream = fs.createWriteStream("output.jsonl");

  // Iterate through the array and write each as a line in the new JSON line file
  parsedData.forEach((messageGroup) => {
    const jsonLine = JSON.stringify({ messages: messageGroup });
    writeStream.write(`${jsonLine}\n`);
  });

  // Close the write stream
  writeStream.end();

  console.log("JSON line file has been written.");
});
