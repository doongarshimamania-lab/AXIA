#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <sys/stat.h>
#include <fcntl.h>

#define PORT 3000
#define DIST_DIR "/home/z/my-project/timelock/dist"
#define BUFSIZE 8192

const char* get_mime(const char* path) {
    const char* ext = strrchr(path, '.');
    if (!ext) return "application/octet-stream";
    if (strcmp(ext, ".html") == 0) return "text/html";
    if (strcmp(ext, ".css") == 0) return "text/css";
    if (strcmp(ext, ".js") == 0) return "application/javascript";
    if (strcmp(ext, ".json") == 0) return "application/json";
    if (strcmp(ext, ".png") == 0) return "image/png";
    if (strcmp(ext, ".jpg") == 0 || strcmp(ext, ".jpeg") == 0) return "image/jpeg";
    if (strcmp(ext, ".svg") == 0) return "image/svg+xml";
    if (strcmp(ext, ".ico") == 0) return "image/x-icon";
    if (strcmp(ext, ".woff") == 0) return "font/woff";
    if (strcmp(ext, ".woff2") == 0) return "font/woff2";
    if (strcmp(ext, ".ttf") == 0) return "font/ttf";
    return "application/octet-stream";
}

void send_file(int client_fd, const char* filepath) {
    int fd = open(filepath, O_RDONLY);
    if (fd < 0) {
        const char* notfound = "HTTP/1.1 404 Not Found\r\nContent-Length: 9\r\n\r\nNot Found";
        send(client_fd, notfound, strlen(notfound), 0);
        return;
    }
    struct stat st;
    fstat(fd, &st);
    const char* mime = get_mime(filepath);
    char header[512];
    int hlen = snprintf(header, sizeof(header),
        "HTTP/1.1 200 OK\r\nContent-Type: %s\r\nContent-Length: %ld\r\n\r\n",
        mime, st.st_size);
    send(client_fd, header, hlen, 0);
    char buf[BUFSIZE];
    ssize_t n;
    while ((n = read(fd, buf, BUFSIZE)) > 0) {
        send(client_fd, buf, n, 0);
    }
    close(fd);
}

int main() {
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_addr.s_addr = INADDR_ANY,
        .sin_port = htons(PORT)
    };
    
    if (bind(server_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        perror("bind");
        return 1;
    }
    listen(server_fd, 100);
    printf("Axia HTTP server running on port %d\n", PORT);
    fflush(stdout);
    
    while (1) {
        int client_fd = accept(server_fd, NULL, NULL);
        if (client_fd < 0) continue;
        
        char buf[BUFSIZE] = {0};
        recv(client_fd, buf, BUFSIZE - 1, 0);
        
        char method[8], url[1024];
        sscanf(buf, "%s %s", method, url);
        
        char filepath[2048];
        if (strcmp(url, "/") == 0) {
            snprintf(filepath, sizeof(filepath), "%s/index.html", DIST_DIR);
        } else {
            snprintf(filepath, sizeof(filepath), "%s%s", DIST_DIR, url);
        }
        
        struct stat st;
        if (stat(filepath, &st) != 0 || S_ISDIR(st.st_mode)) {
            snprintf(filepath, sizeof(filepath), "%s/index.html", DIST_DIR);
        }
        
        send_file(client_fd, filepath);
        close(client_fd);
    }
    return 0;
}
