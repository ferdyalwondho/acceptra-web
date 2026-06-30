FROM php:8.4-fpm-alpine

RUN apk add --no-cache \
    bash \
    curl \
    ghostscript \
    libpng-dev \
    libzip-dev \
    oniguruma-dev \
    postgresql-dev \
    icu-dev \
    zip \
    unzip \
    git \
    nodejs \
    npm

RUN docker-php-ext-configure intl \
 && docker-php-ext-install \
    pdo \
    pdo_pgsql \
    pgsql \
    mbstring \
    zip \
    exif \
    pcntl \
    bcmath \
    gd \
    intl \
    opcache

# Redis extension
RUN apk add --no-cache $PHPIZE_DEPS \
 && pecl install redis \
 && docker-php-ext-enable redis \
 && apk del $PHPIZE_DEPS

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY docker/php/local.ini /usr/local/etc/php/conf.d/local.ini

WORKDIR /var/www/html

EXPOSE 9000

CMD ["php-fpm"]
