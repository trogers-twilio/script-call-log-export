# script-call-log-export
Node.js script that uses the Twilio Helper Library to export Twilio Call Resource records to a CSV file

# Pre-requisites
Node.js, preferably a LTS release. This script was tested using Node.js version 14.18.1
 
# Setup
1. Clone the repository, open a terminal, and change to the repo directory
2. Run `npm install`
3. Copy or rename `.env.sample` to `.env`
4. Edit the `.env` file with the appropriate values for the target Twilio account

# Using the script
To run the script, simply use the command:

```bash
node index.js start-date={YYYY-MM-DD} end-date={YYYY-MM-DD} output-file={filename}.csv
```

Replace the curly bracket values with the desired start date, end date, and output file. The script will request call records in 5 minute blocks to avoid request timeouts in high call volume accounts. 

All records retrieved are then converted to CSV format and saved to the defined "output-file".

