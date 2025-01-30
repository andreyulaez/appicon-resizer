# appicon-resizer

Автоматический генератор **iOS appiconset** из одной иконки размером **1024x1024**.

## Требования

- **Node.js** версии 14 или выше

## Установка и использование

1. Клонируйте репозиторий

    ```bash
    git clone https://github.com/andreyulaez/appicon-resizer.git
    cd appicon-resizer
    ```
3. Установите сторонние пакеты

    ```bash
    npm install
    ```
4. Установите `appicon-resizer` глобально

    ```bash
    npm install -g .
    ```
5. Используйте один из двух вариантов скрипта

    ```bash
    # Адаптирует иконку 1024x1024 под все нужные форматы (iOS)
    appicon-resizer /путь/к/Assets.xcassets/AppIcon.appiconset

    # Пройдется по всем .appiconset внутри данного каталога ассетов
    appicon-resizer /путь/к/Assets.xcassets
    ```
   
