create database if not exists fpms_db;
use fpms_db;
create table if not exists users (
    id int auto_increment primary key,
    name varchar(200) not null,
    phone varchar(15) unique not null,
    password varchar(250) not null,
    role enum('farmer', 'staff', 'admin') default 'farmer',
    created_at timestamp default current_timestamp
);

create table if not exists farmers (
    id int auto_increment primary key,
    user_id int unique not null,
    farmer_id varchar(30) unique not null,
    village varchar(100),
    address varchar(250),
    foreign key (user_id)
        references users(id)
        on delete cascade
);

create table if not exists centres (
    id int auto_increment primary key,
    name varchar(100) not null,
    location varchar(250) not null,
    capacity int not null,
    contact varchar(15),
    created_at timestamp default current_timestamp
);

create table if not exists slots (
    id int auto_increment primary key,
    centre_id int not null,
    slot_date date not null,
    start_time time not null,
    end_time time not null,
    capacity int not null,
    booked int default 0,
    status enum('available', 'full', 'closed') default 'available',
    foreign key (centre_id)
        references centres(id)
        on delete cascade
);

create table if not exists bookings (
    id int auto_increment primary key,
    farmer_id int not null,
    slot_id int not null,
    token_number varchar(30) not null,
    booking_time timestamp default current_timestamp,
    status enum(
        'booked',
        'waiting',
        'serving',
        'completed',
        'cancelled'
    ) default 'booked',
    foreign key (farmer_id)
        references farmers(id)
        on delete cascade,
    foreign key (slot_id)
        references slots(id)
        on delete cascade,
    unique key uniq_farmer_slot (farmer_id, slot_id)
);

create table if not exists procurements (
    id int auto_increment primary key,
    booking_id int unique not null,
    quantity decimal(10,2),
    unit varchar(20) default 'kg',
    status enum(
        'pending',
        'in_progress',
        'completed',
        'rejected'
    ) default 'pending',
    updated_at timestamp
        default current_timestamp
        on update current_timestamp,
    foreign key (booking_id)
        references bookings(id)
        on delete restrict
);

create table if not exists payments (
    id int auto_increment primary key,
    booking_id int unique not null,
    amount decimal(15,2) not null,
    status enum(
        'pending',
        'processing',
        'paid',
        'failed'
    ) default 'pending',
    payment_method enum(
        'cash',
        'bank_transfer',
        'upi'
    ),
    payment_time timestamp null,
    foreign key (booking_id)
        references bookings(id)
        on delete restrict,
    constraint chk_amount_non_negative check (amount >= 0)
);
create table if not exists notifications (
    id int auto_increment primary key,
    user_id int not null,
    booking_id int null,
    type enum(
        'sms',
        'app'
    ) not null,
    title varchar(150),
    message varchar(500) not null,
    status enum(
        'pending',
        'sent',
        'failed'
    ) default 'pending',
    sent_at timestamp null,
    created_at timestamp default current_timestamp,

    foreign key(user_id)
        references users(id)
        on delete cascade,

    foreign key (booking_id)
        references bookings(id)
        on delete set null
);
