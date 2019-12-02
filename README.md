# snipcart-i18n

This repository contains localization files for Snipcart v3.0.

# How to contribute

To submit a new translation, you'll need to open a pull request. To do this, you'll need to start by forking our repository. Open the repository on Github, then click on Fork. This will create a copy of the repository under your Github account.

Once the repo is forked, clone it on your computer. Then open the project with your favorite code editor. You'll see a folder named locales. This is the folder that contains the localization files.

A localization file is a JSON document that contains all the labels used throughout the cart. To add a new language, simply create a new file in this folder, the file should be named with the locale ISO code, for instance en.json for english, or fr.json for french.

Translate all the values in this file, then commit and push your changes to your repository. Then, you will be able to open a pull request. On our side, we'll review the pull request and then merge it if everything looks fine.

Please refer to this article about how forks and pull requests work on Github.

Regional locales
Sometimes, depending on where you're located, some wording might change. For example, some english words and expressions are different in the UK than in the US, so you might want to use a regional location file: en-GB for instance.

When you create a regional locale, you can override only necessary locales, you don't need to rewrite the whole file. Our building process will make sure to merge everything together. Here's an example of what we did for the fr-FR regional locale:

```json
{
    "actions": {
        "continue_shopping": "Continuer les achats"
    },
    "billing": {
        "continue_to_shopping": "Continuer les achats"
    }
}
```