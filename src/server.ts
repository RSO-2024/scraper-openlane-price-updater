import { Builder, By, WebDriver, Key } from 'selenium-webdriver';
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
dotenv.config();

// Create a single supabase client for interacting with your database
const supabase = createClient(process.env.SUPABASEURL!, process.env.SUPABASEKEY!)

async function dismissAndRetry(driver: WebDriver, action: () => Promise<void>, maxRetries = 10): Promise<void> {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      await action();
      return; // If successful, exit the loop
    } catch (error: any) {
      if (
        error.message.includes('is not clickable at point')
      ) {
        console.warn(`Retry ${attempts + 1}: Dismissing overlay and retrying...`);
        await driver.actions().sendKeys(Key.ESCAPE).perform(); // Send ESC key to dismiss the overlay
        await driver.sleep(1000); // Wait for the popup to be dismissed
      } else {
        throw error; // Rethrow if it's not the expected error
      }
    }
    attempts++;
  }
  throw new Error(`Failed to perform the action after ${maxRetries} retries.`);
}

async function login(driver: WebDriver, user: string, pass: string): Promise<void> {
  try {
    await driver.navigate().refresh();
    await driver.sleep(1000);
    await driver.actions().sendKeys(Key.ESCAPE).perform();
    await driver.sleep(1000);
    console.log('Starting login process...');
    // Click the login button to open the login form
    await driver.findElement(By.xpath('//*[@id="loginButton2"]')).click();
    await driver.sleep(1000);

    // Enter username
    const usernameField = await driver.findElement(By.xpath('//*[@id="react-root"]/div/div[2]/div[2]/div/main/div/div[1]/div/div/div/input'));
    await usernameField.sendKeys(user);

    // Click the continue button
    await driver.findElement(By.xpath('//*[@id="loginButton4"]')).click();
    await driver.sleep(1000);

    // Enter password
    const passwordField = await driver.findElement(By.xpath('//*[@id="react-root"]/div/div[2]/div[2]/div/main/div/div[2]/div/div/div/input'));
    await passwordField.sendKeys(pass);

    // Click the login button
    await driver.findElement(By.xpath('//*[@id="loginButton3"]')).click();
    await driver.sleep(1000);

    console.log('Login process completed successfully.');
  } catch (error) {
    console.error('Error during login:', error);
    throw error; // Re-throw to allow retry
  }
}

async function updatePricesForId(id: number) {
  let driver: WebDriver | null = null;
  const user = process.env.OPENLANEUSER;
  const pass = process.env.OPENLANEPASS;
  if (user === undefined || pass === undefined) {
    console.error('Please set OPENLANEUSER and OPENLANEPASS environment variables');
    return;

  }
  try {
    // Create a WebDriver instance connected to Selenium Grid
    driver = await new Builder()
      .usingServer('http://localhost:4444/wd/hub') // Selenium Grid hub URL
      .forBrowser('firefox') // Specify the browser
      .build();

    await driver.get('https://www.openlane.eu/en/home');
    await driver.sleep(5000);

    // Accept cookies if present
    try {
      const cookieButton = await driver.findElement(By.id('onetrust-accept-btn-handler'));
      await cookieButton.click();
    } catch (err) {
      console.log('Cookie acceptance button not found or already dismissed.');
    }

    // Retry the entire login process
    await dismissAndRetry(driver, async () => {
      await login(driver!, user, pass);
    });

    console.log('Login retry mechanism completed successfully.');
    await driver.sleep(10000);
    await driver.actions().sendKeys(Key.ESCAPE).perform();
    await driver.sleep(1000);
    const { data: addata, error: aderror } = await supabase.from('auction_listings').select('url').eq('id', id);
    if (addata && addata.length > 0) {
      await driver.get(addata[0].url); // Replace with your target website
    } else {
      console.error('No data found for the given id.');
    }

    await driver.sleep(5000);

    try {
        const bidHistoryToggle = await driver.findElement(By.xpath('//label[@for="bidhistory-toggle" and contains(@class, "toggle show")]'));
        await bidHistoryToggle.click();
        console.log('Bid history toggle clicked.');
    } catch (err) {
        console.log('Bid history toggle not found or already clicked.');
    }

    const listItems = await driver.findElements(By.xpath('//*[@id="react-root"]/div/div/div[3]/div[2]/div[2]/div[4]/ul/li'));
    var cene = [];
    for (const item of listItems) {

        const text = await item.getText();
        // console.log(text);
        cene.push(text);
    }
    console.log(cene)
    var cene_insert = [];
    for (const cena of cene){
          const dateParts = cena.split('\n')[1].split(' ');
          const date = new Date(`${dateParts[0].split('/').reverse().join('-')}T${dateParts[1]}`);
          cene_insert.push({
            auction_id: id,
            price: cena.split('\n')[2].replace(/\D/g, ''), // Remove all non-numeric characters
            date: date,
            ponudnik: cena.split('\n')[0],
          });
    }
    console.log(cene_insert)
      //https://www.openlane.eu/sl/carv6/transportoptions?auctionId=8787142
      const { data, error } = await supabase.from('auction_prices').insert(cene_insert).select();
      if (error) {
        console.error('Error inserting data:', error);
      } else {
        console.log('Data inserted successfully:', data);
      }

    



  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Quit the driver
    if (driver) {
      await driver.quit();
    }
  }
}


const PROTO_PATH = path.join(__dirname, './price.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const priceProto: any = grpc.loadPackageDefinition(packageDefinition).PriceService;


const server = new grpc.Server();

server.addService(priceProto.service, {
  UpdatePricesForId: (call: any, callback: any) => {
    const id = call.request.id;
    console.log(`Received request to update prices for ID: ${id}`);
    updatePricesForId(id);
    const success = true
    callback(null, { success });
  }
});

// Start the server
const PORT = '50051';
server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    console.error(`Failed to bind server: ${err.message}`);
    return;
  }
  console.log(`Server running at http://0.0.0.0:${port}`);
});