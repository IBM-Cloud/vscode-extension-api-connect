# IBM API Connect Tools
[![Build Status](https://travis-ci.org/IBM-Bluemix/vscode-extension-api-connect.svg?branch=master)](https://travis-ci.org/IBM-Bluemix/vscode-extension-api-connect)
[![Version](https://vsmarketplacebadge.apphb.com/version/IBM.apiconnecttools.svg)](https://marketplace.visualstudio.com/items?itemName=IBM.apiconnecttools)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/IBM.apiconnecttools.svg)](https://marketplace.visualstudio.com/items?itemName=IBM.apiconnecttools)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/IBM.apiconnecttools.svg)](https://marketplace.visualstudio.com/items?itemName=IBM.apiconnecttools)


Leverage Intellisense on [IBM API Connect](https://developer.ibm.com/apiconnect/) projects.

## Features

### Product installation verification
If IBM API Connect is not installed, the tools display a message with a link to the [installation instructions](https://developer.ibm.com/apiconnect/getting-started/):

![Image](https://public.dhe.ibm.com/ibmdl/export/pub/software/websphere/wasdev/updates/apiconnecttools/img/install0.png)

If you select **OK, and don't ask me again**, you can invoke this feature later by using the following command:

![Image](https://public.dhe.ibm.com/ibmdl/export/pub/software/websphere/wasdev/updates/apiconnecttools/img/install1.png)



### Intellisense support for API Connect artifacts
When the tools detect an API Connect project, the tools display the following message:

![Image](https://public.dhe.ibm.com/ibmdl/export/pub/software/websphere/wasdev/updates/apiconnecttools/img/intellisense0.png)

If you select **OK, and don't ask me again**, you can invoke this feature later by using the following command:

![Image](https://public.dhe.ibm.com/ibmdl/export/pub/software/websphere/wasdev/updates/apiconnecttools/img/intellisense1.png)

Once intellisense support is added, hover help and content assist become available on API Connect JavaScript artifacts:

![Image](https://public.dhe.ibm.com/ibmdl/export/pub/software/websphere/wasdev/updates/apiconnecttools/img/content0.png)

Hover help and content assist also become available on API Connect JSON artifacts:

![Image](https://public.dhe.ibm.com/ibmdl/export/pub/software/websphere/wasdev/updates/apiconnecttools/img/content1.png)



### API Connect command invocation
You can access API Connect commands from the Visual Studio Code command pallet palette: 

![Image](https://public.dhe.ibm.com/ibmdl/export/pub/software/websphere/wasdev/updates/apiconnecttools/img/commands0.png)

 * Add intellisense support for API Connect artifacts on this project – add hover help and content assist on API Connect JavaScript artifacts
 * Check installation – check the API Connect installation that is currently installed on your local machine
 * Create development artifacts – contains a list of development artifacts creation commands that you can invoke
 * Create Loopback application – run the API Connect utility for creating a new Loopback application
 * Launch API explorer URL – launch the default browser with the Loopback application's API explorer URL
 * Launch graphical API designer – run the API designer and launch the default browser with the API designer URL
 * Launch web server URL – launch the default browser with the Loopback application's URL
 * Loopback commands – contains a list of Loopback commands that you ca invoke
 * Run API Connect command in terminal – run additional user-defined API Connect commands outside of the commands available in the command palette
 * Start local (runs 'node .' in the terminal) – run the Loopback application by calling the 'node .' in the terminal



## Support
Post issues and questions related to the API Connect Tools via:

[https://github.com/IBM-Bluemix/vscode-extension-api-connect/](https://github.com/IBM-Bluemix/vscode-extension-api-connect)
