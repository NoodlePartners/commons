CREATE TABLE WALL_WALL
(
    ID char(36) NOT NULL,
    SITE_ID varchar(99) NOT NULL,
    EMBEDDER varchar(24) NOT NULL,
    PRIMARY KEY(ID)
);

CREATE TABLE WALL_WALL_POST
(
    WALL_ID char(36) references WALL_WALL(ID),
    POST_ID char(36) references WALL_POST(ID)
);

CREATE TABLE WALL_POST
(
    ID char(36) NOT NULL,
    CONTENT MEDIUMTEXT NOT NULL,
    CREATOR_ID varchar(99) NOT NULL,
    CREATED_DATE datetime NOT NULL,
    MODIFIED_DATE datetime NOT NULL,
    PRIMARY KEY(ID)
);

CREATE TABLE WALL_COMMENT
(
    ID char(36) NOT NULL,
    POST_ID char(36) NOT NULL,
    CONTENT MEDIUMTEXT NOT NULL,
    CREATOR_ID varchar(99) NOT NULL,
    CREATED_DATE datetime NOT NULL,
    MODIFIED_DATE datetime NOT NULL,
    PRIMARY KEY(ID)
);