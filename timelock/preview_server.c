#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <signal.h>
#include <fcntl.h>
#include <sys/wait.h>

#define PORT 3000
#define DOCROOT "/home/z/my-project/timelock/dist"
#define CONVEX_HOST "127.0.0.1"
#define CONVEX_PORT 3210
#define CHUNK 131072
#define CONVEX_PREFIX "/convex"

const char* get_mime(const char* path) {
    if (strstr(path, ".css")) return "text/css; charset=utf-8";
    if (strstr(path, ".js")) return "application/javascript; charset=utf-8";
    if (strstr(path, ".html")) return "text/html; charset=utf-8";
    if (strstr(path, ".png")) return "image/png";
    if (strstr(path, ".svg")) return "image/svg+xml";
    if (strstr(path, ".ico")) return "image/x-icon";
    if (strstr(path, ".json")) return "application/json";
    if (strstr(path, ".woff2")) return "font/woff2";
    if (strstr(path, ".woff")) return "font/woff";
    if (strstr(path, ".ttf")) return "font/ttf";
    if (strstr(path, ".pdf")) return "application/pdf";
    return "application/octet-stream";
}

void send_error(int client, int code, const char* msg) {
    char resp[512];
    int len = snprintf(resp, sizeof(resp),
        "HTTP/1.1 %d %s\r\nContent-Length: 0\r\nConnection: close\r\n\r\n", code, msg);
    write(client, resp, len);
}

void send_file(int client, const char* filepath) {
    struct stat st;
    if (stat(filepath, &st) != 0) {
        send_error(client, 404, "Not Found");
        return;
    }

    long file_size = st.st_size;
    const char *mime = get_mime(filepath);

    char header[1024];
    int hlen = snprintf(header, sizeof(header),
        "HTTP/1.1 200 OK\r\n"
        "Content-Type: %s\r\n"
        "Content-Length: %ld\r\n"
        "Cache-Control: no-cache\r\n"
        "Connection: close\r\n\r\n",
        mime, file_size);
    write(client, header, hlen);

    FILE *f = fopen(filepath, "rb");
    if (!f) return;

    char *buf = malloc(CHUNK);
    if (!buf) { fclose(f); return; }

    long remaining = file_size;
    while (remaining > 0) {
        int to_read = remaining > CHUNK ? CHUNK : (int)remaining;
        int n = fread(buf, 1, to_read, f);
        if (n <= 0) break;
        int written = 0;
        while (written < n) {
            int w = write(client, buf + written, n - written);
            if (w <= 0) break;
            written += w;
        }
        remaining -= n;
    }

    free(buf);
    fclose(f);
}

int connect_convex() {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) return -1;

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(CONVEX_PORT);
    inet_pton(AF_INET, CONVEX_HOST, &addr.sin_addr);

    struct timeval tv = {5, 0};
    setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv));
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

    if (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        close(sock);
        return -1;
    }
    return sock;
}

void proxy_request(int client, const char* method, const char* convex_path, const char* full_request, int req_len) {
    int convex_sock = connect_convex();
    if (convex_sock < 0) {
        send_error(client, 502, "Bad Gateway");
        return;
    }

    // Find the end of the first line
    char *first_line_end = strstr((char*)full_request, "\r\n");
    if (!first_line_end) {
        close(convex_sock);
        send_error(client, 400, "Bad Request");
        return;
    }

    // Send modified request line
    char req_line[4096];
    snprintf(req_line, sizeof(req_line), "%s %s HTTP/1.1", method, convex_path);
    write(convex_sock, req_line, strlen(req_line));
    // Send rest of headers + body
    write(convex_sock, first_line_end, req_len - (first_line_end - full_request));

    // Read body if Content-Length present
    char *cl_str = strcasestr(full_request, "Content-Length:");
    if (cl_str) {
        int content_len = atoi(cl_str + 15);
        if (content_len > 0) {
            char *body_start = strstr((char*)full_request, "\r\n\r\n");
            if (body_start) {
                body_start += 4;
                int body_in_buffer = req_len - (body_start - full_request);
                if (body_in_buffer > 0) {
                    write(convex_sock, body_start, body_in_buffer);
                    content_len -= body_in_buffer;
                }
                char *buf = malloc(CHUNK);
                while (content_len > 0) {
                    int to_read = content_len > CHUNK ? CHUNK : content_len;
                    int n = read(client, buf, to_read);
                    if (n <= 0) break;
                    write(convex_sock, buf, n);
                    content_len -= n;
                }
                free(buf);
            }
        }
    }

    // Proxy response back
    char *buf = malloc(CHUNK);
    while (1) {
        int n = read(convex_sock, buf, CHUNK);
        if (n <= 0) break;
        int written = 0;
        while (written < n) {
            int w = write(client, buf + written, n - written);
            if (w <= 0) break;
            written += w;
        }
    }
    free(buf);
    close(convex_sock);
}

void handle_ws_upgrade(int client, char* modified_req, int modified_len) {
    int convex_sock = connect_convex();
    if (convex_sock < 0) {
        send_error(client, 502, "Bad Gateway");
        return;
    }

    // Forward the upgrade request
    write(convex_sock, modified_req, modified_len);

    // Read the upgrade response
    char resp[4096] = {0};
    int resp_len = read(convex_sock, resp, sizeof(resp) - 1);
    if (resp_len <= 0) {
        close(convex_sock);
        close(client);
        return;
    }

    // Forward response to client
    write(client, resp, resp_len);

    // Bidirectional proxy using fork
    pid_t pid = fork();
    if (pid == 0) {
        // Child: client -> convex
        char buf[CHUNK];
        while (1) {
            int n = read(client, buf, sizeof(buf));
            if (n <= 0) break;
            if (write(convex_sock, buf, n) <= 0) break;
        }
        _exit(0);
    } else {
        // Parent: convex -> client
        char buf[CHUNK];
        while (1) {
            int n = read(convex_sock, buf, sizeof(buf));
            if (n <= 0) break;
            if (write(client, buf, n) <= 0) break;
        }
        kill(pid, SIGTERM);
    }

    close(convex_sock);
    close(client);
}

void handle_client(int client) {
    char *req = malloc(65536);
    if (!req) { close(client); return; }
    memset(req, 0, 65536);
    int n = read(client, req, 65535);
    if (n <= 0) { free(req); close(client); return; }

    // Parse method
    char method[16] = {0};
    char *space = strchr(req, ' ');
    if (!space) { free(req); close(client); return; }
    int method_len = space - req;
    if (method_len >= (int)sizeof(method)) method_len = sizeof(method) - 1;
    strncpy(method, req, method_len);

    // Parse path
    char *path_start = space + 1;
    char *path_end = strchr(path_start, ' ');
    if (!path_end) { free(req); close(client); return; }
    *path_end = 0;

    // Strip query string for path matching only
    char path_copy[2048];
    strncpy(path_copy, path_start, sizeof(path_copy) - 1);
    char *qs = strchr(path_copy, '?');
    if (qs) *qs = 0;

    // Check if Convex API request
    if (strncmp(path_copy, CONVEX_PREFIX, strlen(CONVEX_PREFIX)) == 0) {
        const char* convex_path = path_copy + strlen(CONVEX_PREFIX);
        if (*convex_path == 0) convex_path = "/";

        // Check for WebSocket upgrade
        if (strcasestr(req, "Upgrade: websocket") || strcasestr(req, "upgrade: websocket")) {
            // Rebuild request with path without /convex prefix
            // Find where path starts and ends in original request
            char *orig_path_start = strchr(req, ' ') + 1;
            char *orig_path_end = strchr(orig_path_start, ' ');
            int before_path_len = orig_path_start - req;

            // Build modified request: method + space + new_path + rest
            char *modified = malloc(n + 100);
            memcpy(modified, req, before_path_len);
            int prefix_len = strlen(CONVEX_PREFIX);

            // Find where /convex starts in the original path
            char *convex_in_orig = strstr(orig_path_start, CONVEX_PREFIX);
            if (convex_in_orig && convex_in_orig < orig_path_end) {
                int before_convex = convex_in_orig - req;
                memcpy(modified, req, before_convex);
                int new_path_len = 0;
                // Skip /convex prefix
                const char *after_convex = req + before_convex + prefix_len;
                int after_convex_len = orig_path_end - after_convex;
                if (after_convex_len < 0) after_convex_len = 0;

                memcpy(modified + before_convex, after_convex, after_convex_len);
                new_path_len = after_convex_len;
                if (new_path_len == 0 || modified[before_convex] != '/') {
                    modified[before_convex] = '/';
                    new_path_len = 1;
                }
                memcpy(modified + before_convex + new_path_len, orig_path_end, n - (orig_path_end - req));
                int modified_len = before_convex + new_path_len + (n - (orig_path_end - req));
                handle_ws_upgrade(client, modified, modified_len);
            } else {
                // Fallback: just proxy as-is with the path
                char *modified_rest = orig_path_end;
                int rest_len = n - (modified_rest - req);
                char modified_req[65536];
                int mlen = snprintf(modified_req, sizeof(modified_req), "%s %s", method, convex_path);
                memcpy(modified_req + mlen, modified_rest, rest_len);
                handle_ws_upgrade(client, modified_req, mlen + rest_len);
            }
            free(req);
            return;
        }

        // Regular HTTP proxy
        proxy_request(client, method, convex_path, req, n);
        free(req);
        return;
    }

    // Serve static files
    if (strcmp(method, "GET") != 0 && strcmp(method, "HEAD") != 0) {
        send_error(client, 405, "Method Not Allowed");
        free(req);
        return;
    }

    char filepath[1024];
    if (strcmp(path_copy, "/") == 0) {
        snprintf(filepath, sizeof(filepath), "%s/index.html", DOCROOT);
        send_file(client, filepath);
    } else {
        snprintf(filepath, sizeof(filepath), "%s%s", DOCROOT, path_copy);
        struct stat st;
        if (stat(filepath, &st) == 0 && S_ISREG(st.st_mode)) {
            send_file(client, filepath);
        } else {
            snprintf(filepath, sizeof(filepath), "%s/index.html", DOCROOT);
            send_file(client, filepath);
        }
    }
    free(req);
    close(client);
}

int main() {
    signal(SIGPIPE, SIG_IGN);
    signal(SIGHUP, SIG_IGN);
    signal(SIGCHLD, SIG_IGN);

    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(PORT);

    if (bind(server_fd, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        perror("bind");
        return 1;
    }

    if (listen(server_fd, 128) < 0) {
        perror("listen");
        return 1;
    }

    // Daemonize
    pid_t pid = fork();
    if (pid < 0) { perror("fork"); return 1; }
    if (pid > 0) {
        printf("Server daemon PID %d on port %d\n", pid, PORT);
        return 0;
    }

    setsid();

    while (1) {
        int client = accept(server_fd, NULL, NULL);
        if (client < 0) continue;

        pid_t handler = fork();
        if (handler == 0) {
            handle_client(client);
            _exit(0);
        }
        close(client);
    }

    return 0;
}
